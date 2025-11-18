import { useState } from 'react';
import TabContainer from '../TabContainer';

function GenericTool({ toolName, endpoint, inputLabel = 'Target', inputPlaceholder = 'Enter target', buttonLabel = 'Execute', paramName = 'target' }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [containerStatus, setContainerStatus] = useState(null);
  const [containerName, setContainerName] = useState(null);

  const handleExecute = async () => {
    if (!input.trim()) {
      setError(`Please enter ${inputLabel.toLowerCase()}`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setContainerStatus('running');

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [paramName]: input.trim(),
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setResult(data);
        setContainerName(data.container_name);
        // Container is now running, status will be updated via log polling
      } else {
        setError(data.message || 'Execution failed');
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
      <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'rgba(var(--theme-primary-rgb, 255, 51, 0), 0.1)', border: '1px solid var(--theme-primary, #ff3300)' }}>
        <p style={{ margin: 0, color: 'var(--theme-primary, #ff3300)', fontSize: '11px' }}>
          {toolName} - OSINT Tool Interface
        </p>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--theme-primary, #ff3300)' }}>
          {inputLabel}:
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleExecute()}
          placeholder={inputPlaceholder}
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
        onClick={handleExecute}
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
        {loading ? 'Running...' : buttonLabel}
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
            ✓ Execution completed successfully
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

export default GenericTool;
