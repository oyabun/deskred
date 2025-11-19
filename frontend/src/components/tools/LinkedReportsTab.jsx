import { useState, useEffect } from 'react';
import { Link2, ChevronRight, Calendar, User, Hash, FileText } from 'lucide-react';
import { API_URL } from '../../config';

const ENTITY_API_URL = `${API_URL}/entities`;

function LinkedReportsTab({ aggregationId, username }) {
  const [linkedReports, setLinkedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedReport, setExpandedReport] = useState(null);

  useEffect(() => {
    loadLinkedReports();
  }, [aggregationId]);

  const loadLinkedReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${ENTITY_API_URL}/report/${aggregationId}/linked`);
      const data = await response.json();

      if (data.status === 'success') {
        setLinkedReports(data.linked_reports);
      } else {
        setError('Failed to load linked reports');
      }
    } catch (err) {
      setError('Error loading linked reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (reportId) => {
    // This would open the report in a new Nexus window
    // For now, just copy the report ID
    navigator.clipboard.writeText(reportId);
    alert(`Report ID "${reportId}" copied to clipboard!\n\nOpen Nexus and search for this report ID.`);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--theme-primary, #ff3300)' }}>
        Finding linked reports...
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

  if (!linkedReports || linkedReports.length === 0) {
    return (
      <div style={{
        padding: '20px',
        fontFamily: 'Courier New, monospace'
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(51, 153, 255, 0.1)',
          border: '1px solid #3399ff',
          color: '#3399ff',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Link2 size={20} />
            <strong style={{ fontSize: '14px' }}>No Linked Reports Found</strong>
          </div>
          <p style={{ fontSize: '12px', margin: '5px 0', lineHeight: '1.5' }}>
            This report has no connections to other investigations yet.
          </p>
        </div>

        <div style={{ fontSize: '12px', color: '#999', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#fff' }}>How Report Linking Works:</strong>
          </p>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              Reports are automatically linked when they share entities (emails, people, domains, etc.)
            </li>
            <li style={{ marginBottom: '8px' }}>
              Run follow-up investigations from the "Follow-Ups" tab
            </li>
            <li style={{ marginBottom: '8px' }}>
              New reports will automatically connect if they share entities with this one
            </li>
          </ul>

          <p style={{ marginTop: '15px', color: '#3399ff' }}>
            💡 Tip: The more follow-ups you run, the more connections you'll discover!
          </p>
        </div>
      </div>
    );
  }

  // Sort by connection strength (number of shared entities)
  const sortedReports = [...linkedReports].sort((a, b) => b.connection_strength - a.connection_strength);

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '15px',
      fontFamily: 'Courier New, monospace'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          color: 'var(--theme-primary, #ff3300)',
          marginBottom: '10px',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Link2 size={18} />
          CONNECTED INVESTIGATIONS
        </h3>
        <div style={{ fontSize: '12px', color: '#999' }}>
          Found <strong style={{ color: '#00ff00' }}>{linkedReports.length}</strong> report{linkedReports.length > 1 ? 's' : ''}
          {' '}linked to <strong style={{ color: '#00ff00' }}>{username}</strong> through shared entities
        </div>
      </div>

      {/* Connection Strength Legend */}
      <div style={{
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid #333',
        fontSize: '11px'
      }}>
        <div style={{ color: '#999', marginBottom: '5px' }}>
          <strong>Connection Strength:</strong> Number of shared entities
        </div>
        <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
          <span style={{ color: '#ff3300' }}>● Strong (5+)</span>
          <span style={{ color: '#ff9900' }}>● Medium (2-4)</span>
          <span style={{ color: '#3399ff' }}>● Weak (1)</span>
        </div>
      </div>

      {/* Linked Reports List */}
      {sortedReports.map((linkedReport, idx) => (
        <LinkedReportItem
          key={linkedReport.report_id}
          linkedReport={linkedReport}
          index={idx + 1}
          expanded={expandedReport === linkedReport.report_id}
          onToggleExpand={(id) => setExpandedReport(expandedReport === id ? null : id)}
          onViewReport={handleViewReport}
        />
      ))}
    </div>
  );
}

function LinkedReportItem({ linkedReport, index, expanded, onToggleExpand, onViewReport }) {
  // Determine connection strength color
  const getStrengthColor = (strength) => {
    if (strength >= 5) return '#ff3300'; // Strong
    if (strength >= 2) return '#ff9900'; // Medium
    return '#3399ff'; // Weak
  };

  const strengthColor = getStrengthColor(linkedReport.connection_strength);

  return (
    <div style={{
      marginBottom: '15px',
      padding: '15px',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${strengthColor}44`,
      borderLeft: `4px solid ${strengthColor}`,
      fontSize: '12px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              backgroundColor: strengthColor,
              color: '#000',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '3px'
            }}>
              #{index}
            </span>
            <h4 style={{ color: strengthColor, fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
              Report: {linkedReport.username || 'Unknown'}
            </h4>
          </div>

          {/* Metadata */}
          <div style={{ marginLeft: '35px', fontSize: '11px', color: '#999' }}>
            <div style={{ marginBottom: '3px' }}>
              <Hash size={12} style={{ display: 'inline', marginRight: '5px' }} />
              {linkedReport.report_id.substring(0, 30)}...
            </div>
            {linkedReport.created_at && (
              <div style={{ marginBottom: '3px' }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: '5px' }} />
                {new Date(linkedReport.created_at).toLocaleString()}
              </div>
            )}
            {linkedReport.total_profiles > 0 && (
              <div>
                <FileText size={12} style={{ display: 'inline', marginRight: '5px' }} />
                {linkedReport.total_profiles} profiles found
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
          <button
            onClick={() => onViewReport(linkedReport.report_id)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--theme-primary, #ff3300)',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            View Report →
          </button>
        </div>
      </div>

      {/* Connection Info */}
      <div style={{
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${strengthColor}33`,
        marginBottom: '10px'
      }}>
        <div style={{ color: '#fff', marginBottom: '8px', fontSize: '11px' }}>
          <strong style={{ color: strengthColor }}>
            Connection Strength: {linkedReport.connection_strength}
          </strong>
          {' '}({linkedReport.shared_entities?.length || 0} shared entit{linkedReport.shared_entities?.length === 1 ? 'y' : 'ies'})
        </div>

        {/* Shared Entities Summary */}
        {linkedReport.shared_entities && linkedReport.shared_entities.length > 0 && (
          <div>
            <button
              onClick={() => onToggleExpand(linkedReport.report_id)}
              style={{
                padding: '3px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#999',
                border: '1px solid #444',
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontSize: '10px',
                marginTop: '5px'
              }}
            >
              {expanded ? '▼ Hide' : '▶ Show'} Shared Entities
            </button>

            {expanded && (
              <div style={{ marginTop: '10px', paddingLeft: '10px', borderLeft: '2px solid #444' }}>
                {linkedReport.shared_entities.map((entity, idx) => (
                  <div key={idx} style={{
                    marginBottom: '8px',
                    padding: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid #555',
                    fontSize: '10px'
                  }}>
                    <div style={{ color: '#3399ff', fontWeight: 'bold', marginBottom: '3px' }}>
                      {entity.category.toUpperCase()}
                    </div>
                    <div style={{ color: '#ccc', wordBreak: 'break-word' }}>
                      {JSON.stringify(entity.entity_data, null, 2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual Indicator */}
      <div style={{
        fontSize: '10px',
        color: '#666',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
        <span style={{ fontSize: '16px' }}>●</span>
        <span>
          {linkedReport.connection_strength >= 5 ? 'Strong connection - Likely same target or closely related' :
           linkedReport.connection_strength >= 2 ? 'Medium connection - Some overlapping entities' :
           'Weak connection - Minor overlap'}
        </span>
      </div>
    </div>
  );
}

export default LinkedReportsTab;
