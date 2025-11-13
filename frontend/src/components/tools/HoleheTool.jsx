import { useState } from 'react';
import TabContainer from '../TabContainer';

function HoleheTool() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [containerStatus, setContainerStatus] = useState(null);

  const handleCheck = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setContainerStatus('running');

    try {
      const response = await fetch('http://localhost:8000/api/holehe/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setResult(data);
        // Container is now running, status will be updated via log polling
      } else {
        setError(data.message || 'Check failed');
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
          Email Address:
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
          placeholder="Enter email to check"
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
        onClick={handleCheck}
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
        {loading ? 'Checking...' : 'Check'}
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
            ✓ Check completed successfully for: <strong>{result.email}</strong>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <TabContainer
      toolContent={toolContent}
      containerId={result?.container_id}
      containerStatus={containerStatus}
    />
  );
}

export default HoleheTool;
