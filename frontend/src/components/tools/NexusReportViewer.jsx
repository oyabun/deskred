import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const API_URL = 'http://localhost:8000/api/nexus';

function NexusReportViewer({ aggregationId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [aggregationId]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/report/${aggregationId}`);
      const data = await response.json();
      if (data.status === 'success') {
        setReport(data.report);
      } else {
        setError('Failed to load report');
      }
    } catch (err) {
      setError('Error loading report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#ff3300' }}>
        Loading report...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        border: '1px solid #ff0000',
        color: '#ff3300'
      }}>
        {error}
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '20px', color: '#ff3300' }}>
        Report not found
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '15px',
      fontFamily: 'Courier New, monospace'
    }}>
      <h2 style={{ color: '#ff3300', marginBottom: '15px', fontSize: '18px' }}>
        OBSCURA REPORT - {report.username}
      </h2>
      <p style={{ fontSize: '12px', marginBottom: '5px' }}>
        <strong>Report ID:</strong> {report.aggregation_id}
      </p>
      <p style={{ fontSize: '12px', marginBottom: '15px' }}>
        <strong>Generated:</strong> {new Date(report.created_at).toLocaleString()}
      </p>

      <h3 style={{ color: '#3399ff', marginTop: '15px', marginBottom: '10px', fontSize: '14px' }}>
        Summary
      </h3>
      <p style={{ fontSize: '12px' }}>
        Total Profiles Found: <strong>{report.report.summary.total_profiles_found}</strong>
      </p>
      <p style={{ fontSize: '12px' }}>
        Unique Sites: <strong>{report.report.summary.unique_sites}</strong>
      </p>
      <p style={{ fontSize: '12px' }}>
        Tools Run: {report.report.summary.tools_run}
      </p>

      <h3 style={{ color: '#3399ff', marginTop: '15px', marginBottom: '10px', fontSize: '14px' }}>
        Results by Tool
      </h3>
      {report.report.by_tool.map((t, i) => (
        <p key={i} style={{ fontSize: '11px' }}>
          [{t.tool}] Found: <strong>{t.found}</strong>
        </p>
      ))}

      {/* Visualizations */}
      {report.visualization && (
        <>
          <h3 style={{ color: '#3399ff', marginTop: '20px', marginBottom: '10px', fontSize: '14px' }}>
            Visualizations
          </h3>

          {/* Category Breakdown */}
          {report.visualization.category_breakdown && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#ff3300', fontSize: '12px', marginBottom: '5px' }}>
                Category Breakdown
              </h4>
              <Plot
                data={report.visualization.category_breakdown.data}
                layout={{
                  ...report.visualization.category_breakdown.layout,
                  width: 700,
                  height: 300,
                  paper_bgcolor: '#0a0000',
                  plot_bgcolor: '#0a0000',
                  font: { color: '#ff3300', family: 'Courier New, monospace' }
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}

          {/* Platform Distribution */}
          {report.visualization.platform_distribution && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#ff3300', fontSize: '12px', marginBottom: '5px' }}>
                Platform Distribution
              </h4>
              <Plot
                data={report.visualization.platform_distribution.data}
                layout={{
                  ...report.visualization.platform_distribution.layout,
                  width: 700,
                  height: 400,
                  paper_bgcolor: '#0a0000',
                  plot_bgcolor: '#0a0000',
                  font: { color: '#ff3300', family: 'Courier New, monospace' }
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}

          {/* Network Graph */}
          {report.visualization.network_graph && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#ff3300', fontSize: '12px', marginBottom: '5px' }}>
                Profile Network
              </h4>
              <Plot
                data={report.visualization.network_graph.data}
                layout={{
                  ...report.visualization.network_graph.layout,
                  width: 700,
                  height: 500,
                  paper_bgcolor: '#0a0000',
                  plot_bgcolor: '#0a0000',
                  font: { color: '#ff3300', family: 'Courier New, monospace' }
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}

          {/* Tool Comparison */}
          {report.visualization.tool_comparison && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#ff3300', fontSize: '12px', marginBottom: '5px' }}>
                Tool Comparison
              </h4>
              <Plot
                data={report.visualization.tool_comparison.data}
                layout={{
                  ...report.visualization.tool_comparison.layout,
                  width: 700,
                  height: 300,
                  paper_bgcolor: '#0a0000',
                  plot_bgcolor: '#0a0000',
                  font: { color: '#ff3300', family: 'Courier New, monospace' }
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}
        </>
      )}

      <h3 style={{ color: '#3399ff', marginTop: '15px', marginBottom: '10px', fontSize: '14px' }}>
        Found Profiles ({report.report.all_profiles.length})
      </h3>
      <div style={{ fontSize: '11px' }}>
        {Object.entries(report.report.by_site).map(([site, profiles]) => (
          <div key={site} style={{ marginBottom: '10px' }}>
            <div style={{ color: '#3399ff', fontWeight: 'bold', marginBottom: '3px' }}>
              [{site}]
            </div>
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
  );
}

export default NexusReportViewer;
