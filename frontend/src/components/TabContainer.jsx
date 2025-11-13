import { useState, useEffect, useRef } from 'react';

function TabContainer({ toolContent, containerId, containerStatus }) {
  const [activeTab, setActiveTab] = useState('application');
  const [logs, setLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const logsEndRef = useRef(null);
  const logStreamInterval = useRef(null);

  // Stream logs from container
  useEffect(() => {
    if (containerId && (containerStatus === 'running' || containerStatus === 'created')) {
      setIsStreaming(true);

      const fetchLogs = async () => {
        try {
          // Determine endpoint based on container ID (container name pattern)
          // Container names follow pattern: deskred-{toolname}-{uuid}
          let toolName = 'maigret'; // default

          if (containerId.includes('sherlock')) toolName = 'sherlock';
          else if (containerId.includes('holehe')) toolName = 'holehe';
          else if (containerId.includes('theharvester')) toolName = 'harvester';
          else if (containerId.includes('recon-ng')) toolName = 'recon-ng';
          else if (containerId.includes('social-analyzer')) toolName = 'social-analyzer';
          else if (containerId.includes('spiderfoot')) toolName = 'spiderfoot';
          else if (containerId.includes('digitalfootprint')) toolName = 'digitalfootprint';
          else if (containerId.includes('gosearch')) toolName = 'gosearch';

          const endpoint = `http://localhost:8000/api/${toolName}/logs/${containerId}`;
          const response = await fetch(endpoint);
          const data = await response.json();

          if (data.status === 'success' && data.logs) {
            // Parse logs and categorize lines
            const parsedLogs = data.logs.split('\n').filter(line => line.trim()).map((line, idx) => {
              // Remove timestamp prefix if present
              let cleanLine = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+/, '');
              // Remove ANSI color codes (e.g., \x1b[31m, \x1b[0m, [0m, etc.)
              cleanLine = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[[0-9;]*m/g, '');
              return {
                id: idx,
                text: cleanLine,
                type: detectLogType(cleanLine)
              };
            });
            setLogs(parsedLogs);

            // Stop streaming if container finished
            if (data.container_status === 'exited') {
              setIsStreaming(false);
              if (logStreamInterval.current) {
                clearInterval(logStreamInterval.current);
                logStreamInterval.current = null;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching logs:', error);
        }
      };

      // Initial fetch
      fetchLogs();

      // Poll every second while running
      logStreamInterval.current = setInterval(fetchLogs, 1000);

      return () => {
        if (logStreamInterval.current) {
          clearInterval(logStreamInterval.current);
          logStreamInterval.current = null;
        }
      };
    } else if (containerStatus === 'exited') {
      setIsStreaming(false);
    }
  }, [containerId, containerStatus]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current && activeTab === 'logs') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  const detectLogType = (line) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error') || lowerLine.includes('fail') || lowerLine.includes('exception')) {
      return 'error';
    }
    if (lowerLine.includes('success') || lowerLine.includes('complete') || lowerLine.includes('found') || line.includes('[+]')) {
      return 'success';
    }
    if (lowerLine.includes('warn')) {
      return 'warning';
    }
    if (lowerLine.includes('info') || lowerLine.includes('start') || line.includes('[*]')) {
      return 'info';
    }
    return '';
  };

  const parseResults = () => {
    if (logs.length === 0) return null;

    // Parse the logs to extract meaningful data
    const results = [];
    const stats = {
      found: 0,
      total: logs.length,
      errors: 0
    };

    logs.forEach(log => {
      // Count different statuses
      if (log.text.includes('[+]') || log.text.toLowerCase().includes('found')) {
        stats.found++;
      }
      if (log.text.toLowerCase().includes('error')) {
        stats.errors++;
      }

      // Extract URLs or key findings
      const urlMatch = log.text.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        // Strip ANSI color codes from URL (e.g., [0m, [31m, etc.)
        const cleanUrl = urlMatch[0].replace(/\x1b\[[0-9;]*m/g, '').replace(/\[0m/g, '');
        results.push({
          type: 'url',
          value: cleanUrl,
          line: log.text
        });
      }
    });

    return { results, stats };
  };

  const ResultsView = () => {
    const parsed = parseResults();
    if (!parsed) {
      return null;
    }

    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{
          padding: '10px',
          backgroundColor: 'rgba(255, 51, 0, 0.1)',
          border: '1px solid #ff3300',
          marginBottom: '15px'
        }}>
          <div style={{ color: 'var(--theme-primary, #ff3300)', fontFamily: 'Fira Mono, monospace', fontSize: '11px' }}>
            <strong>Results Summary:</strong>
            <div style={{ marginTop: '5px' }}>
              • Found: <span style={{ color: '#00ff00' }}>{parsed.stats.found}</span>
            </div>
            <div>
              • Total Lines: {parsed.stats.total}
            </div>
            {parsed.stats.errors > 0 && (
              <div>
                • Errors: <span style={{ color: '#ff0000' }}>{parsed.stats.errors}</span>
              </div>
            )}
            {isStreaming && (
              <div style={{ marginTop: '5px', color: '#3399ff' }}>
                • Status: <span style={{ animation: 'pulse 1.5s infinite' }}>Streaming...</span>
              </div>
            )}
          </div>
        </div>

        {parsed.results.length > 0 && (
          <div>
            <strong style={{ color: 'var(--theme-primary, #ff3300)', fontFamily: 'Fira Mono, monospace', fontSize: '12px' }}>
              URLs Found ({parsed.results.length}):
            </strong>
            <div style={{ marginTop: '10px', maxHeight: '200px', overflow: 'auto' }}>
              {parsed.results.map((result, idx) => (
                <div key={idx} style={{
                  padding: '8px',
                  marginBottom: '5px',
                  backgroundColor: 'rgba(0, 255, 0, 0.05)',
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  fontFamily: 'Fira Mono, monospace',
                  fontSize: '11px'
                }}>
                  <a
                    href={result.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#00ff00', textDecoration: 'none' }}
                  >
                    {result.value}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeTab === 'application' ? 'active' : ''}`}
          onClick={() => setActiveTab('application')}
        >
          Application
        </button>
        <button
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Container Output
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'application' && (
          <div>
            {toolContent}
            {logs.length > 0 && <ResultsView />}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-container">
            {logs.length === 0 ? (
              <div style={{ color: 'var(--theme-primary, #ff3300)', opacity: 0.6 }}>
                {containerId ? 'Waiting for container output...' : 'No output yet. Run a search to see container execution logs...'}
              </div>
            ) : (
              <>
                {isStreaming && (
                  <div style={{
                    padding: '5px 10px',
                    backgroundColor: 'rgba(51, 153, 255, 0.1)',
                    border: '1px solid #3399ff',
                    color: '#3399ff',
                    marginBottom: '10px',
                    fontSize: '11px',
                    fontFamily: 'Fira Mono, monospace'
                  }}>
                    ⚡ Streaming logs in real-time...
                  </div>
                )}
                {logs.map((log) => (
                  <div key={log.id} className={`log-line ${log.type}`}>
                    {log.text}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TabContainer;
