import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import EntitiesTab from './EntitiesTab';
import FollowUpsTab from './FollowUpsTab';
import LinkedReportsTab from './LinkedReportsTab';
import { API_URL as BASE_API_URL } from '../../config';

const API_URL = `${BASE_API_URL}/api/nexus`;

function NexusReportViewer({ aggregationId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');

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
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--theme-primary, #ff3300)' }}>
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
        color: 'var(--theme-primary, #ff3300)'
      }}>
        {error}
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '20px', color: 'var(--theme-primary, #ff3300)' }}>
        Report not found
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Courier New, monospace'
    }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--theme-primary, #ff3300)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        flexShrink: 0
      }}>
        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'summary' ? 'var(--theme-primary, #ff3300)' : 'transparent',
            color: activeTab === 'summary' ? '#000' : 'var(--theme-primary, #ff3300)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRight: '1px solid #333'
          }}
        >
          Summary & Profiles
        </button>
        <button
          onClick={() => setActiveTab('entities')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'entities' ? '#00ff00' : 'transparent',
            color: activeTab === 'entities' ? '#000' : '#00ff00',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRight: '1px solid #333'
          }}
        >
          Entities
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'followups' ? '#ff9900' : 'transparent',
            color: activeTab === 'followups' ? '#000' : '#ff9900',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRight: '1px solid #333'
          }}
        >
          Follow-Ups
        </button>
        <button
          onClick={() => setActiveTab('linked')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'linked' ? '#3399ff' : 'transparent',
            color: activeTab === 'linked' ? '#000' : '#3399ff',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          Linked Reports
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'summary' && (
          <div style={{
            height: '100%',
            overflowY: 'auto',
            padding: '15px'
          }}>
            <h2 style={{ color: 'var(--theme-primary, #ff3300)', marginBottom: '15px', fontSize: '18px' }}>
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
              <h4 style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px', marginBottom: '5px' }}>
                Category Breakdown
              </h4>
              <Plot
                data={report.visualization.category_breakdown.data}
                layout={{
                  ...report.visualization.category_breakdown.layout,
                  width: 700,
                  height: 300,
                  paper_bgcolor: 'var(--theme-bg, #0a0000)',
                  plot_bgcolor: 'var(--theme-bg, #0a0000)',
                  font: { color: 'var(--theme-primary, #ff3300)', family: 'Courier New, monospace' }
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}

          {/* Platform Distribution */}
          {report.visualization.platform_distribution && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px', marginBottom: '5px' }}>
                Platform Distribution
              </h4>
              <Plot
                data={report.visualization.platform_distribution.data}
                layout={{
                  ...report.visualization.platform_distribution.layout,
                  width: 700,
                  height: 400,
                  paper_bgcolor: 'var(--theme-bg, #0a0000)',
                  plot_bgcolor: 'var(--theme-bg, #0a0000)',
                  font: { color: 'var(--theme-primary, #ff3300)', family: 'Courier New, monospace' }
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}

          {/* Network Graph */}
          {report.visualization.network_graph && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px', marginBottom: '5px' }}>
                Profile Network
              </h4>
              <Plot
                data={report.visualization.network_graph.data}
                layout={{
                  ...report.visualization.network_graph.layout,
                  width: 700,
                  height: 500,
                  paper_bgcolor: 'var(--theme-bg, #0a0000)',
                  plot_bgcolor: 'var(--theme-bg, #0a0000)',
                  font: { color: 'var(--theme-primary, #ff3300)', family: 'Courier New, monospace' }
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}

          {/* Tool Comparison */}
          {report.visualization.tool_comparison && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px', marginBottom: '5px' }}>
                Tool Comparison
              </h4>
              <Plot
                data={report.visualization.tool_comparison.data}
                layout={{
                  ...report.visualization.tool_comparison.layout,
                  width: 700,
                  height: 300,
                  paper_bgcolor: 'var(--theme-bg, #0a0000)',
                  plot_bgcolor: 'var(--theme-bg, #0a0000)',
                  font: { color: 'var(--theme-primary, #ff3300)', family: 'Courier New, monospace' }
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
                  color: 'var(--theme-primary, #ff3300)',
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
        )}

        {activeTab === 'entities' && (
          <EntitiesTab aggregationId={report.aggregation_id} />
        )}

        {activeTab === 'followups' && (
          <FollowUpsTab
            aggregationId={report.aggregation_id}
            username={report.username}
          />
        )}

        {activeTab === 'linked' && (
          <LinkedReportsTab
            aggregationId={report.aggregation_id}
            username={report.username}
          />
        )}
      </div>
    </div>
  );
}

export default NexusReportViewer;
