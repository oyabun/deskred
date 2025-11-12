import { useState, useEffect } from 'react';
import { Search, RotateCw, List, Eye, FileJson, FileText, Trash2 } from 'lucide-react';

const API_URL = 'http://localhost:8000/api/nexus';

function NexusTool({ onOpenReport }) {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total_reports: 0, total_usernames: 0, connected: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    await Promise.all([loadStats(), loadReports()]);
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/reports?limit=100`);
      const data = await response.json();
      if (data.status === 'success') {
        setReports(data.reports);
      } else {
        setError('Failed to load reports');
      }
    } catch (err) {
      setError('Error connecting to API: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchReports = async () => {
    if (!searchQuery.trim()) {
      loadReports();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: searchQuery.trim() })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setReports(data.reports);
      } else {
        setError('Failed to search reports');
      }
    } catch (err) {
      setError('Error searching reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (aggregationId) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/report/${aggregationId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.status === 'success') {
        loadData();
      } else {
        setError('Failed to delete report');
      }
    } catch (err) {
      setError('Error deleting report: ' + err.message);
    }
  };

  const exportReport = (aggregationId, format) => {
    window.open(`${API_URL}/export/${format}/${aggregationId}`, '_blank');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchReports();
    }
  };

  return (
    <div className="tool-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="tool-header">
        <h2 style={{ margin: 0, color: '#ff3300' }}>⬢ NEXUS ⬢</h2>
        <div style={{ fontSize: '12px', color: '#cc2200' }}>OSINT Report Management System</div>
      </div>

      {/* Statistics */}
      <div style={{
        display: 'flex',
        gap: '15px',
        padding: '10px',
        backgroundColor: 'rgba(255, 51, 0, 0.1)',
        border: '1px solid #ff3300',
        marginBottom: '10px'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00ff00' }}>{stats.total_reports}</div>
          <div style={{ fontSize: '10px', color: '#ff3300' }}>Total Reports</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00ff00' }}>{stats.total_usernames}</div>
          <div style={{ fontSize: '10px', color: '#ff3300' }}>Unique Usernames</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: stats.connected ? '#00ff00' : '#ff0000' }}>
            {stats.connected ? 'Online' : 'Offline'}
          </div>
          <div style={{ fontSize: '10px', color: '#ff3300' }}>Redis Status</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search by username..."
          className="tool-input"
          style={{
            flex: 1,
            backgroundColor: '#0a0000',
            border: '1px solid #ff3300',
            color: '#ff3300',
            padding: '8px',
            fontFamily: 'Courier New, monospace'
          }}
        />
        <button
          className="tool-button"
          onClick={searchReports}
          title="Search"
          style={{
            backgroundColor: '#0a0000',
            border: '1px solid #ff3300',
            color: '#ff3300',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Search size={16} />
        </button>
        <button
          className="tool-button"
          onClick={loadReports}
          title="Show All"
          style={{
            backgroundColor: '#0a0000',
            border: '1px solid #ff3300',
            color: '#ff3300',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <List size={16} />
        </button>
        <button
          className="tool-button"
          onClick={loadData}
          title="Refresh"
          style={{
            backgroundColor: '#0a0000',
            border: '1px solid #ff3300',
            color: '#ff3300',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          border: '1px solid #ff0000',
          padding: '10px',
          marginBottom: '10px',
          fontSize: '12px'
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#ff3300' }}>
          Loading reports...
        </div>
      )}

      {/* Reports Table */}
      {!loading && reports.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>No reports found</h3>
          <p>Run Obscura to generate OSINT reports</p>
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: 'rgba(255, 51, 0, 0.2)', padding: '8px', border: '1px solid #ff3300', textAlign: 'left' }}>Username</th>
                <th style={{ backgroundColor: 'rgba(255, 51, 0, 0.2)', padding: '8px', border: '1px solid #ff3300', textAlign: 'left' }}>Created</th>
                <th style={{ backgroundColor: 'rgba(255, 51, 0, 0.2)', padding: '8px', border: '1px solid #ff3300', textAlign: 'left' }}>Profiles</th>
                <th style={{ backgroundColor: 'rgba(255, 51, 0, 0.2)', padding: '8px', border: '1px solid #ff3300', textAlign: 'left' }}>Sites</th>
                <th style={{ backgroundColor: 'rgba(255, 51, 0, 0.2)', padding: '8px', border: '1px solid #ff3300', textAlign: 'left' }}>Report ID</th>
                <th style={{ backgroundColor: 'rgba(255, 51, 0, 0.2)', padding: '8px', border: '1px solid #ff3300', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.aggregation_id} style={{ borderBottom: '1px solid #ff3300' }}>
                  <td style={{ padding: '6px 8px', border: '1px solid #ff3300', borderTop: 'none' }}>
                    <strong>{report.username}</strong>
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ff3300', borderTop: 'none' }}>
                    {new Date(report.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ff3300', borderTop: 'none' }}>
                    {report.total_profiles}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ff3300', borderTop: 'none' }}>
                    {report.unique_sites}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ff3300', borderTop: 'none', fontSize: '9px' }}>
                    <code>{report.aggregation_id}</code>
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ff3300', borderTop: 'none' }}>
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => onOpenReport(report.aggregation_id, report.username)}
                        title="View Report"
                        style={{
                          backgroundColor: '#0a0000',
                          border: '1px solid #ff3300',
                          color: '#ff3300',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => exportReport(report.aggregation_id, 'json')}
                        title="Export JSON"
                        style={{
                          backgroundColor: '#0a0000',
                          border: '1px solid #ff3300',
                          color: '#ff3300',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FileJson size={14} />
                      </button>
                      <button
                        onClick={() => exportReport(report.aggregation_id, 'pdf')}
                        title="Export PDF"
                        style={{
                          backgroundColor: '#0a0000',
                          border: '1px solid #ff3300',
                          color: '#ff3300',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => deleteReport(report.aggregation_id)}
                        title="Delete Report"
                        style={{
                          backgroundColor: '#0a0000',
                          border: '1px solid #ff0000',
                          color: '#ff0000',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default NexusTool;
