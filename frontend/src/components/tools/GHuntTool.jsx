import { useState, useEffect } from 'react';
import TabContainer from '../TabContainer';

function GHuntTool() {
  const [email, setEmail] = useState('');
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [containerId, setContainerId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginInstructions, setLoginInstructions] = useState('');

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Poll for logs when container is running
  useEffect(() => {
    if (!containerId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ghunt/logs/${containerId}`);
        const data = await response.json();

        if (data.logs) {
          setLogs(data.logs);
        }

        if (data.status === 'exited') {
          clearInterval(interval);
          setIsLoading(false);
          setContainerId(null);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [containerId]);

  const checkAuthStatus = async () => {
    setCheckingAuth(true);
    try {
      const response = await fetch('/api/ghunt/auth/status');
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
      if (!data.authenticated && data.instructions) {
        setLoginInstructions(data.instructions);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setLogs('Initiating GHunt login process...\n');

    try {
      const response = await fetch('/api/ghunt/auth/login', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.status === 'success') {
        setContainerId(data.container_id);
        setLogs(data.message + '\n\nFollow the instructions in the Container Output tab.\n');
      } else {
        setLogs('Error: ' + data.message);
        setIsLoading(false);
      }
    } catch (error) {
      setLogs('Error starting login process: ' + error.message);
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!email.trim()) {
      alert('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setLogs(`Searching for Google account: ${email}...\n`);

    try {
      const response = await fetch('/api/ghunt/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setContainerId(data.container_id);
        setLogs(data.message + '\n');
      } else {
        setLogs('Error: ' + data.message + '\n');
        setIsLoading(false);

        // If authentication error, update auth status
        if (data.message.includes('session') || data.message.includes('login')) {
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      setLogs('Error: ' + error.message);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && isAuthenticated) {
      handleSearch();
    }
  };

  const toolContent = (
    <div style={{ fontFamily: 'Fira Mono, monospace', fontSize: '12px' }}>
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ color: 'var(--theme-primary, #ff3300)', marginBottom: '10px' }}>GHunt - Google Account OSINT</h3>
        <p style={{ color: 'var(--theme-primary, #ff3300)', opacity: 0.8, fontSize: '11px' }}>
          Investigate Google/Gmail accounts for OSINT information
        </p>
      </div>

      {checkingAuth ? (
        <div style={{ padding: '10px', color: 'var(--theme-primary, #ff3300)' }}>
          <p>Checking authentication status...</p>
        </div>
      ) : !isAuthenticated ? (
        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(255, 165, 0, 0.1)',
          border: '1px solid #ffa500',
          marginBottom: '15px'
        }}>
          <h3 style={{ color: '#ffa500', marginBottom: '10px' }}>⚠️ Authentication Required</h3>
          <p style={{ color: 'var(--theme-primary, #ff3300)', marginBottom: '5px' }}>
            GHunt requires Google authentication to function.
          </p>
          <p style={{ color: 'var(--theme-primary, #ff3300)', marginBottom: '10px' }}>
            You need to authenticate once before using this tool.
          </p>
          {loginInstructions && (
            <pre style={{
              fontSize: '10px',
              padding: '10px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--theme-primary, #ff3300)',
              overflow: 'auto'
            }}>
              {loginInstructions}
            </pre>
          )}
          <div style={{ marginTop: '15px' }}>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff3300',
                color: 'var(--theme-bg, #0a0000)',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'Fira Mono, monospace',
                fontSize: '12px',
                fontWeight: 'bold',
                opacity: isLoading ? 0.6 : 1,
                marginRight: '10px'
              }}
            >
              {isLoading ? 'Starting Login Process...' : 'Start Login Process'}
            </button>
            <button
              onClick={checkAuthStatus}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: 'var(--theme-primary, #ff3300)',
                border: '1px solid var(--theme-primary, #ff3300)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'Fira Mono, monospace',
                fontSize: '12px',
                fontWeight: 'bold',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Recheck Auth Status
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--theme-primary, #ff3300)' }}>
              Email Address:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter Gmail/Google email address"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'var(--theme-bg, #0a0000)',
                border: '1px solid var(--theme-primary, #ff3300)',
                color: 'var(--theme-primary, #ff3300)',
                fontFamily: 'Fira Mono, monospace',
                fontSize: '12px',
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !email.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff3300',
              color: 'var(--theme-bg, #0a0000)',
              border: 'none',
              cursor: (isLoading || !email.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: 'Fira Mono, monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              opacity: (isLoading || !email.trim()) ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Investigating...' : 'Investigate Google Account'}
          </button>
        </div>
      )}

      {logs && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: 'rgba(255, 51, 0, 0.1)',
          border: '1px solid #ff3300',
        }}>
          <h3 style={{ color: 'var(--theme-primary, #ff3300)', marginBottom: '10px', fontSize: '13px' }}>Status</h3>
          <pre style={{
            fontSize: '11px',
            color: 'var(--theme-primary, #ff3300)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {logs}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <TabContainer
      toolContent={toolContent}
      containerId={containerId}
      containerStatus={isLoading ? 'running' : 'exited'}
    />
  );
}

export default GHuntTool;
