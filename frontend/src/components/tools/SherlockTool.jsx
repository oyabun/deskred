import { useState } from 'react';
import TabContainer from '../TabContainer';
import { API_URL } from '../../config';

function SherlockTool() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [containerStatus, setContainerStatus] = useState(null);
  const [containerName, setContainerName] = useState(null);

  const handleSearch = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setContainerStatus('running');

    try {
      const response = await fetch(`${API_URL}/api/sherlock/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setResult(data);
        setContainerName(data.container_name);
        // Container is now running, status will be updated via log polling
      } else {
        setError(data.message || 'Search failed');
        setContainerStatus(null);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      setContainerStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const toolContent = (
    <div style={{ fontFamily: 'Fira Mono, monospace', fontSize: '12px' }}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--theme-primary, #ff3300)' }}>
          Username:
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter username to search"
          disabled={loading}
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
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ff3300',
          color: 'var(--theme-bg, #0a0000)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'Fira Mono, monospace',
          fontSize: '12px',
          fontWeight: 'bold',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Hunting...' : 'Hunt'}
      </button>

      {error && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          border: '1px solid #ff0000',
          color: 'var(--theme-primary, #ff3300)',
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '15px' }}>
          <div style={{
            padding: '10px',
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            border: '1px solid #00ff00',
            color: '#00ff00',
            marginBottom: '10px',
          }}>
            ✓ Hunt completed successfully for: <strong>{result.username}</strong>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <TabContainer
      toolContent={toolContent}
      containerId={result?.container_id}
      containerName={containerName}
      containerStatus={containerStatus}
    />
  );
}

export default SherlockTool;
