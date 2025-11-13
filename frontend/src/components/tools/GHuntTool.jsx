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

  const ApplicationTab = () => (
    <div className="tool-container">
      <div className="tool-header">
        <h2>GHunt - Google Account OSINT</h2>
        <p>Investigate Google/Gmail accounts for OSINT information</p>
      </div>

      {checkingAuth ? (
        <div className="auth-status">
          <p>Checking authentication status...</p>
        </div>
      ) : !isAuthenticated ? (
        <div className="auth-required">
          <div className="auth-warning">
            <h3>⚠️ Authentication Required</h3>
            <p>GHunt requires Google authentication to function.</p>
            <p>You need to authenticate once before using this tool.</p>
            {loginInstructions && (
              <pre className="instructions">{loginInstructions}</pre>
            )}
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Starting Login Process...' : 'Start Login Process'}
          </button>
          <button
            onClick={checkAuthStatus}
            disabled={isLoading}
            className="btn-secondary"
            style={{ marginLeft: '10px' }}
          >
            Recheck Auth Status
          </button>
        </div>
      ) : (
        <div className="tool-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter Gmail/Google email address"
              disabled={isLoading}
              className="retro-input"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !email.trim()}
            className="btn-primary"
          >
            {isLoading ? 'Investigating...' : 'Investigate Google Account'}
          </button>
        </div>
      )}

      {logs && (
        <div className="tool-output">
          <h3>Status</h3>
          <pre>{logs}</pre>
        </div>
      )}
    </div>
  );

  const ContainerOutputTab = () => (
    <div className="tool-container">
      <div className="tool-header">
        <h3>Live Container Output</h3>
      </div>
      <div className="log-output">
        <pre>{logs || 'No output yet. Run a search to see logs.'}</pre>
      </div>
    </div>
  );

  return (
    <TabContainer
      tabs={[
        { id: 'app', label: 'Application', content: <ApplicationTab /> },
        { id: 'output', label: 'Container Output', content: <ContainerOutputTab /> },
      ]}
    />
  );
}

export default GHuntTool;
