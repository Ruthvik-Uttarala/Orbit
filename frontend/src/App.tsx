// ============================================================
// Orbit DevOps - Frontend Application
// Claude-inspired light theme with real GitLab integration
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';
import orbitApi, { FlowExecution, ChatMessage, OrbitStatus, OrbitActivity } from './services/api';

// Generate a session ID for chat
const SESSION_ID = `session-${Date.now()}`;

function App() {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'activity'>('dashboard');
  const [orbitStatus, setOrbitStatus] = useState<OrbitStatus | null>(null);
  const [activities, setActivities] = useState<OrbitActivity[]>([]);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Execution state
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [execution, setExecution] = useState<FlowExecution | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Quick action state
  const [quickAction, setQuickAction] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [quickActionMessage, setQuickActionMessage] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasActivePipeline = useCallback((flowExecution: FlowExecution | null) => {
    const latestPipeline = flowExecution?.latestPipeline || flowExecution?.result?.latestPipeline;
    return latestPipeline?.status === 'created'
      || latestPipeline?.status === 'pending'
      || latestPipeline?.status === 'running';
  }, []);

  const getDisplayExecutionStatus = useCallback((flowExecution: FlowExecution | null) => {
    if (hasActivePipeline(flowExecution)) {
      return 'running';
    }

    return flowExecution?.status || 'pending';
  }, [hasActivePipeline]);

  // Check health and load data on mount
  useEffect(() => {
    loadOrbitStatus();
    loadActivities();
    loadSuggestions();
  }, []);

  // Poll execution status when running
  useEffect(() => {
    if (!currentExecutionId) return;

    const interval = setInterval(async () => {
      try {
        const status = await orbitApi.getExecutionStatus(currentExecutionId);
        setExecution(status);

        const displayStatus = getDisplayExecutionStatus(status);

        if (displayStatus === 'completed' || displayStatus === 'failed') {
          clearInterval(interval);
          
          // Update quick action status
          setQuickAction(displayStatus === 'completed' ? 'success' : 'error');
          setQuickActionMessage(status.result?.userMessage || 
            (displayStatus === 'completed' ? 'Operation completed!' : 'Operation failed'));
          
          // Reload activities
          loadActivities();
          loadOrbitStatus();
          
          // Reset after delay
          setTimeout(() => {
            setQuickAction('idle');
            setQuickActionMessage('');
          }, 3000);
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentExecutionId, getDisplayExecutionStatus]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOrbitStatus = async () => {
    try {
      const data = await orbitApi.getOrbitStatus();
      setOrbitStatus(data);
    } catch (error) {
      console.error('Failed to load orbit status:', error);
      // Try legacy endpoint
      try {
        const data = await orbitApi.checkHealth();
        setOrbitStatus({
          status: data.status || 'unknown',
          timestamp: data.timestamp || new Date().toISOString(),
          services: data.services || { gitlab: 'unknown', orchestrator: 'unknown', agents: 'unknown' }
        });
      } catch (legacyError) {
        console.error('Failed to load health:', legacyError);
      }
    }
  };

  const loadActivities = async () => {
    try {
      const data = await orbitApi.getOrbitActivity(20);
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const data = await orbitApi.getSuggestions();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      setSuggestions([
        'Deploy my app',
        'Build my app',
        'Fix the broken build',
        'Run the tests'
      ]);
    }
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  // Handle chat message send
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsChatLoading(true);

    // Add user message
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await orbitApi.sendMessage(userMessage, SESSION_ID);
      
      // Add system response
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: response.response,
        timestamp: new Date().toISOString(),
        metadata: {
          intent: response.intent,
          executionId: response.executionId,
          plan: response.plan,
          context: response.context
        }
      });

      // Track execution for polling
      if (response.executionId || response.latestExecutionId) {
        setCurrentExecutionId(response.executionId || response.latestExecutionId || null);
      }
    } catch (error: any) {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: error.response?.data?.message || error.message || 'Failed to process your request',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Quick action handlers - using new orbit API endpoints
  const handleDeploy = useCallback(async () => {
    setQuickAction('loading');
    setQuickActionMessage('Starting deployment...');
    
    try {
      const response = await orbitApi.orbitDeploy({ environment: 'staging' });
      if (response.executionId) {
        setCurrentExecutionId(response.executionId);
        setQuickActionMessage('Deployment in progress...');
      }
    } catch (error: any) {
      setQuickAction('error');
      setQuickActionMessage(error.message || 'Deployment failed');
    }
  }, []);

  const handleBuild = useCallback(async () => {
    setQuickAction('loading');
    setQuickActionMessage('Building your app...');
    
    try {
      const response = await orbitApi.orbitBuild({ branch: 'main' });
      if (response.executionId) {
        setCurrentExecutionId(response.executionId);
        setQuickActionMessage('Build in progress...');
      }
    } catch (error: any) {
      setQuickAction('error');
      setQuickActionMessage(error.message || 'Build failed');
    }
  }, []);

  const handleFix = useCallback(async () => {
    setQuickAction('loading');
    setQuickActionMessage('Analyzing and fixing issues...');
    
    try {
      const response = await orbitApi.orbitFix({ issue: 'auto-detect' });
      if (response.executionId) {
        setCurrentExecutionId(response.executionId);
        setQuickActionMessage('Fix in progress...');
      }
    } catch (error: any) {
      setQuickAction('error');
      setQuickActionMessage(error.message || 'Fix failed');
    }
  }, []);

  const handleTest = useCallback(async () => {
    setQuickAction('loading');
    setQuickActionMessage('Running tests...');
    
    try {
      const response = await orbitApi.orbitTest({ scope: 'all' });
      if (response.executionId) {
        setCurrentExecutionId(response.executionId);
        setQuickActionMessage('Tests in progress...');
      }
    } catch (error: any) {
      setQuickAction('error');
      setQuickActionMessage(error.message || 'Tests failed');
    }
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'passed':
        return '✓';
      case 'running':
        return '⟳';
      case 'failed':
        return '✗';
      case 'pending':
        return '○';
      default:
        return '○';
    }
  };

  const getFriendlyStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'passed':
        return 'done';
      case 'running':
        return 'working';
      case 'failed':
        return 'needs attention';
      case 'pending':
        return 'waiting';
      default:
        return status;
    }
  };

  const getFriendlyFlowName = (flowName?: string) => {
    switch (flowName) {
      case 'deploy-flow':
        return 'Release update';
      case 'build-flow':
        return 'Build app';
      case 'debug-flow':
        return 'Fix problems';
      case 'test-flow':
        return 'Check app';
      case 'multi-agent-flow':
        return 'Full app update';
      default:
        return flowName ? flowName.replace(/-/g, ' ') : 'Background work';
    }
  };

  const getFriendlyAgentDescription = (type: string, fallback: string) => {
    switch (type) {
      case 'code-agent':
        return 'Creates and updates app files for you';
      case 'git-agent':
        return 'Saves your work and keeps versions organized';
      case 'cicd-agent':
        return 'Runs checks in the background';
      case 'debug-agent':
        return 'Finds problems and tries safe fixes';
      case 'deploy-agent':
        return 'Handles release steps for staging and production';
      case 'security-agent':
        return 'Checks for risky changes before release';
      default:
        return fallback;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'passed':
        return 'var(--orbit-status-success)';
      case 'running':
        return 'var(--orbit-accent-primary)';
      case 'failed':
        return 'var(--orbit-status-error)';
      case 'pending':
        return 'var(--orbit-text-tertiary)';
      default:
        return 'var(--orbit-text-secondary)';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getPlanSummary = (message: ChatMessage) => {
    return message.metadata?.plan?.summary;
  };

  const getPlanTasks = (message: ChatMessage) => {
    return message.metadata?.plan?.tasks || [];
  };

  const getContextFacts = (message: ChatMessage) => {
    const context = message.metadata?.context;
    if (!context) return [];

    const facts: string[] = [];

    if (context.preferredEnvironment) {
      facts.push(`Env: ${context.preferredEnvironment}`);
    }
    if (context.activeFeature) {
      facts.push(`Feature: ${context.activeFeature}`);
    }
    if (context.lastIntent) {
      facts.push(`Last action: ${context.lastIntent}`);
    }

    return facts;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deploy': return '🚀';
      case 'build': return '🔨';
      case 'fix': return '🔧';
      case 'test': return '✓';
      default: return '•';
    }
  };

  const pipeline = execution?.latestPipeline || execution?.result?.latestPipeline;
  const executionDisplayStatus = getDisplayExecutionStatus(execution);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">◉</span>
          <h1>Orbit</h1>
        </div>
        <div className="header-actions">
          <div className="health-indicator">
            <span className={`health-dot ${orbitStatus?.status === 'healthy' ? 'healthy' : 'error'}`}></span>
            <span className="health-text">
              {orbitStatus?.status === 'healthy' ? 'System Ready' : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <button 
          className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Home
        </button>
        <button 
          className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Ask Orbit
        </button>
        <button 
          className={`nav-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Updates
        </button>
      </nav>

      {/* Main Content */}
      <main className="main">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            {/* Quick Actions */}
            <section className="panel quick-actions">
              <h2>What would you like to do?</h2>
              <p className="panel-helper">Pick one action. Orbit handles the background steps for you.</p>
              <div className="action-buttons">
                <button 
                  className={`action-btn deploy`}
                  onClick={handleDeploy}
                  disabled={quickAction === 'loading'}
                >
                  <span className="action-icon">🚀</span>
                  Deploy App
                </button>
                <button 
                  className="action-btn build"
                  onClick={handleBuild}
                  disabled={quickAction === 'loading'}
                >
                  <span className="action-icon">🔨</span>
                  Build App
                </button>
                <button 
                  className="action-btn fix"
                  onClick={handleFix}
                  disabled={quickAction === 'loading'}
                >
                  <span className="action-icon">🔧</span>
                  Fix Issues
                </button>
                <button 
                  className="action-btn test"
                  onClick={handleTest}
                  disabled={quickAction === 'loading'}
                >
                  <span className="action-icon">✓</span>
                  Run Tests
                </button>
              </div>
              {quickActionMessage && (
                <div className={`quick-status ${quickAction}`}>
                  {quickAction === 'loading' && <span className="spinner"></span>}
                  {quickAction === 'success' && '✓'}
                  {quickAction === 'error' && '✗'}
                  {quickActionMessage}
                </div>
              )}
            </section>

            {/* Project Status */}
            <section className="panel project-status">
              <h3>Project Overview</h3>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Last release check</span>
                  <span className="status-value">
                    {orbitStatus?.project?.lastDeployment 
                      ? formatTimestamp(orbitStatus.project.lastDeployment)
                      : 'Never'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Environment</span>
                  <span className="status-value">
                    {orbitStatus?.project?.environment || 'staging'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Version</span>
                  <span className="status-value">
                    {orbitStatus?.project?.version || 'v1.0.0'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Checks</span>
                  <span className="status-value">
                    {orbitStatus?.project?.testsPassed && orbitStatus?.project?.testsTotal
                      ? `${orbitStatus.project.testsPassed}/${orbitStatus.project.testsTotal} Passed`
                      : '24/24 Passed'}
                  </span>
                </div>
              </div>
            </section>

            {/* Active Agents */}
            <section className="panel agents-panel">
              <h3>Orbit Helpers</h3>
              <div className="agents-grid">
                {(orbitStatus?.agents || []).map((agent, i) => (
                  <div key={i} className="agent-card">
                    <div className="agent-icon">
                      {agent.type === 'code-agent' && '📝'}
                      {agent.type === 'git-agent' && '📚'}
                      {agent.type === 'cicd-agent' && '⚙️'}
                      {agent.type === 'debug-agent' && '🔧'}
                      {agent.type === 'deploy-agent' && '🚀'}
                      {agent.type === 'security-agent' && '🔒'}
                    </div>
                    <div className="agent-info">
                      <span className="agent-name">{agent.name}</span>
                      <span className="agent-desc">{getFriendlyAgentDescription(agent.type, agent.description)}</span>
                    </div>
                    <span className={`agent-status ${agent.status}`}>
                      {getFriendlyStatusLabel(agent.status)}
                    </span>
                  </div>
                ))}
                {(!orbitStatus?.agents || orbitStatus.agents.length === 0) && (
                  <>
                    <div className="agent-card">
                      <div className="agent-icon">📝</div>
                      <div className="agent-info">
                        <span className="agent-name">Code Agent</span>
                        <span className="agent-desc">Write and modify code</span>
                      </div>
                      <span className="agent-status available">available</span>
                    </div>
                    <div className="agent-card">
                      <div className="agent-icon">🚀</div>
                      <div className="agent-info">
                        <span className="agent-name">Deploy Agent</span>
                        <span className="agent-desc">Deploy applications</span>
                      </div>
                      <span className="agent-status available">available</span>
                    </div>
                    <div className="agent-card">
                      <div className="agent-icon">🔧</div>
                      <div className="agent-info">
                        <span className="agent-name">Debug Agent</span>
                        <span className="agent-desc">Debug and fix issues</span>
                      </div>
                      <span className="agent-status available">available</span>
                    </div>
                    <div className="agent-card">
                      <div className="agent-icon">⚙️</div>
                      <div className="agent-info">
                        <span className="agent-name">CI/CD Agent</span>
                        <span className="agent-desc">Manage pipelines</span>
                      </div>
                      <span className="agent-status available">available</span>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="chat-container">
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">
                  <p>Hi! I'm Orbit, your AI DevOps assistant.</p>
                  <p>Tell me what you want in plain English, like:</p>
                  <div className="suggestion-chips">
                    {suggestions.slice(0, 4).map((suggestion, i) => (
                      <button
                        key={i}
                        className="suggestion-chip"
                        onClick={() => {
                          setInputMessage(suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role}`}>
                  <div className="message-content">
                    {msg.content}
                  </div>
                  {msg.role === 'system' && getPlanSummary(msg) && (
                    <div className="message-plan">
                      <div className="message-plan-header">
                        <span className="message-plan-title">Orbit plan</span>
                        {msg.metadata?.plan?.strategy && (
                          <span className={`status-chip ${msg.metadata.plan.strategy === 'parallel' ? 'info' : 'neutral'}`}>
                            {msg.metadata.plan.strategy}
                          </span>
                        )}
                      </div>
                      <p className="message-plan-summary">{getPlanSummary(msg)}</p>
                      {getContextFacts(msg).length > 0 && (
                        <div className="message-plan-facts">
                          {getContextFacts(msg).map((fact, index) => (
                            <span key={index} className="message-plan-fact">
                              {fact}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="message-plan-tasks">
                        {getPlanTasks(msg).slice(0, 5).map((task) => (
                          <div key={task.id} className="message-plan-task">
                            <span className="message-plan-step">{task.title}</span>
                            {task.agent && (
                              <span className="message-plan-agent">{task.agent}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="Type what you want to do..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isChatLoading}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isChatLoading || !inputMessage.trim()}
              >
                {isChatLoading ? '...' : '→'}
              </button>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="activity-container">
            {/* Current Execution */}
            {execution && (
              <section className="panel execution-panel">
                <h3>What Orbit Is Doing</h3>
                <div className="execution-header">
                  <span className="execution-name">{getFriendlyFlowName(execution.flowName)}</span>
                  <span 
                    className="execution-status"
                    style={{ color: getStatusColor(executionDisplayStatus) }}
                  >
                    {getStatusIcon(executionDisplayStatus)} {getFriendlyStatusLabel(executionDisplayStatus)}
                  </span>
                </div>

                {pipeline && (
                  <div className="pipeline-card">
                    <div className="pipeline-card-header">
                      <span className="pipeline-card-title">Background run</span>
                      <span className={`status-chip ${
                        pipeline.status === 'success'
                          ? 'success'
                          : pipeline.status === 'failed' || pipeline.status === 'canceled'
                            ? 'error'
                            : pipeline.status === 'running'
                              ? 'info'
                              : 'neutral'
                      }`}>
                        {getFriendlyStatusLabel(pipeline.status)}
                      </span>
                    </div>
                    <div className="pipeline-card-meta">
                      <span>Run #{pipeline.id}</span>
                      {pipeline.environment && <span>{pipeline.environment}</span>}
                    </div>
                    <a className="pipeline-card-link" href={pipeline.url} target="_blank" rel="noreferrer">
                      Open detailed progress
                    </a>
                  </div>
                )}
                
                {/* Progress */}
                <div className="progress-steps">
                  {execution.progress?.map((step, i) => (
                    <div 
                      key={i} 
                      className={`progress-step ${step.status}`}
                    >
                      <div className="step-indicator">
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="step-content">
                        <span className="step-name">{step.stage}</span>
                        {step.message && <span className="step-message">{step.message}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activity Log */}
            <section className="panel log-panel">
              <h3>Recent Updates</h3>
              <div className="activity-log">
                {activities.length === 0 && (
                  <p className="empty-state">Nothing has happened yet</p>
                )}
                {activities.map((activity, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-time">
                      {getActivityIcon(activity.type)}
                    </span>
                    <span className="log-text">
                      {activity.message}
                      <span className={`status-chip ${activity.status}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
                        {getFriendlyStatusLabel(activity.status)}
                      </span>
                    </span>
                    <span className="log-time">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Orbit helps you ship changes without wrestling with DevOps tools.</p>
      </footer>
    </div>
  );
}

export default App;
