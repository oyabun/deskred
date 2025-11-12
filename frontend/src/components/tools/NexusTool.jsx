import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const API_URL = 'http://localhost:8000/api/nexus';

function NexusTool() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total_reports: 0, total_usernames: 0, connected: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

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

  const viewReport = async (aggregationId) => {
    try {
      const response = await fetch(`${API_URL}/report/${aggregationId}`);
      const data = await response.json();
      if (data.status === 'success') {
        setSelectedReport(data.report);
        setShowModal(true);
      }
    } catch (err) {
      setError('Error loading report: ' + err.message);
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
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search by username..."
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: '#1a0102',
            border: '1px solid #ff3300',
            color: '#ff3300',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px'
          }}
        />
        <button className="tool-button" onClick={searchReports}>Search</button>
        <button className="tool-button" onClick={loadReports}>Show All</button>
        <button className="tool-button" onClick={loadData}>Refresh</button>
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
                        onClick={() => viewReport(report.aggregation_id)}
                        style={{
                          padding: '3px 6px',
                          fontSize: '10px',
                          backgroundColor: '#3399ff',
                          border: 'none',
                          color: '#000',
                          cursor: 'pointer',
                          fontFamily: 'Courier New, monospace'
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => exportReport(report.aggregation_id, 'json')}
                        style={{
                          padding: '3px 6px',
                          fontSize: '10px',
                          backgroundColor: '#00ff00',
                          border: 'none',
                          color: '#000',
                          cursor: 'pointer',
                          fontFamily: 'Courier New, monospace'
                        }}
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => exportReport(report.aggregation_id, 'pdf')}
                        style={{
                          padding: '3px 6px',
                          fontSize: '10px',
                          backgroundColor: '#00ff00',
                          border: 'none',
                          color: '#000',
                          cursor: 'pointer',
                          fontFamily: 'Courier New, monospace'
                        }}
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => deleteReport(report.aggregation_id)}
                        style={{
                          padding: '3px 6px',
                          fontSize: '10px',
                          backgroundColor: '#ff0000',
                          border: 'none',
                          color: '#000',
                          cursor: 'pointer',
                          fontFamily: 'Courier New, monospace'
                        }}
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 10000,
          overflowY: 'auto',
          padding: '20px'
        }}
        onClick={() => setShowModal(false)}
        >
          <div style={{
            maxWidth: '950px',
            margin: '0 auto',
            backgroundColor: '#160909',
            border: '2px solid #ff3300',
            padding: '20px',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <span
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '20px',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#ff3300'
              }}
            >
              &times;
            </span>

            <h2 style={{ color: '#ff3300', marginBottom: '15px', fontSize: '18px' }}>
              OBSCURA REPORT - {selectedReport.username}
            </h2>
            <p style={{ fontSize: '12px' }}><strong>Report ID:</strong> {selectedReport.aggregation_id}</p>
            <p style={{ fontSize: '12px' }}><strong>Generated:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p>

            <h3 style={{ color: '#3399ff', marginTop: '15px', marginBottom: '10px', fontSize: '14px' }}>Summary</h3>
            <p style={{ fontSize: '12px' }}>Total Profiles Found: <strong>{selectedReport.report.summary.total_profiles_found}</strong></p>
            <p style={{ fontSize: '12px' }}>Unique Sites: <strong>{selectedReport.report.summary.unique_sites}</strong></p>
            <p style={{ fontSize: '12px' }}>Tools Run: {selectedReport.report.summary.tools_run}</p>

            <h3 style={{ color: '#3399ff', marginTop: '15px', marginBottom: '10px', fontSize: '14px' }}>Results by Tool</h3>
            {selectedReport.report.by_tool.map((t, i) => (
              <p key={i} style={{ fontSize: '11px' }}>[{t.tool}] Found: <strong>{t.found}</strong></p>
            ))}

            {/* Visualizations */}
            {selectedReport.visualization && (
              <>
                <h3 style={{ color: '#3399ff', marginTop: '20px', marginBottom: '10px', fontSize: '14px' }}>Visualizations</h3>

                {/* Category Breakdown */}
                {selectedReport.visualization.category_breakdown && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ color: '#ff3300', fontSize: '12px', marginBottom: '5px' }}>Category Breakdown</h4>
                    <Plot
                      data={selectedReport.visualization.category_breakdown.data}
                      layout={{
                        ...selectedReport.visualization.category_breakdown.layout,
                        width: 850,
                        height: 300,
                        paper_bgcolor: '#160909',
                        plot_bgcolor: '#160909',
                        font: { color: '#ff3300', family: 'Courier New, monospace' }
                      }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                )}

                {/* Platform Distribution */}
                {selectedReport.visualization.platform_distribution && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ color: '#ff3300', fontSize: '12px', marginBottom: '5px' }}>Platform Distribution</h4>
                    <Plot
                      data={selectedReport.visualization.platform_distribution.data}
                      layout={{
                        ...selectedReport.visualization.platform_distribution.layout,
                        width: 850,
                        height: 400,
                        paper_bgcolor: '#160909',
                        plot_bgcolor: '#160909',
                        font: { color: '#ff3300', family: 'Courier New, monospace' }
                      }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                )}

                {/* Network Graph */}
                {selectedReport.visualization.network_graph && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ color: '#ff3300', fontSize: '12px', marginBottom: '5px' }}>Profile Network</h4>
                    <Plot
                      data={selectedReport.visualization.network_graph.data}
                      layout={{
                        ...selectedReport.visualization.network_graph.layout,
                        width: 850,
                        height: 500,
                        paper_bgcolor: '#160909',
                        plot_bgcolor: '#160909',
                        font: { color: '#ff3300', family: 'Courier New, monospace' }
                      }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                )}

                {/* Tool Comparison */}
                {selectedReport.visualization.tool_comparison && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ color: '#ff3300', fontSize: '12px', marginBottom: '5px' }}>Tool Comparison</h4>
                    <Plot
                      data={selectedReport.visualization.tool_comparison.data}
                      layout={{
                        ...selectedReport.visualization.tool_comparison.layout,
                        width: 850,
                        height: 300,
                        paper_bgcolor: '#160909',
                        plot_bgcolor: '#160909',
                        font: { color: '#ff3300', family: 'Courier New, monospace' }
                      }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                )}
              </>
            )}

            <h3 style={{ color: '#3399ff', marginTop: '15px', marginBottom: '10px', fontSize: '14px' }}>
              Found Profiles ({selectedReport.report.all_profiles.length})
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '11px' }}>
              {Object.entries(selectedReport.report.by_site).map(([site, profiles]) => (
                <div key={site} style={{ marginBottom: '10px' }}>
                  <div style={{ color: '#3399ff', fontWeight: 'bold', marginBottom: '3px' }}>[{site}]</div>
                  {profiles.map((profile, i) => (
                    <a
                      key={i}
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#ff3300',
                        textDecoration: 'none',
                        display: 'block',
                        paddingLeft: '15px',
                        marginBottom: '2px'
                      }}
                    >
                      {profile.url}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NexusTool;
