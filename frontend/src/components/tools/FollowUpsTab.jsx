import { useState, useEffect } from 'react';
import { ChevronRight, Search, Mail, Globe, MapPin, Users, AlertCircle } from 'lucide-react';

const ENTITY_API_URL = 'http://localhost:8000/api/entities';

const PRIORITY_CONFIG = {
  HIGH: {
    color: '#ff3300',
    icon: '🔴',
    label: 'HIGH PRIORITY'
  },
  MEDIUM: {
    color: '#ff9900',
    icon: '🟡',
    label: 'MEDIUM PRIORITY'
  },
  LOW: {
    color: '#3399ff',
    icon: '🟢',
    label: 'LOW PRIORITY'
  }
};

const TYPE_ICONS = {
  person_investigation: Users,
  email_investigation: Mail,
  domain_investigation: Globe,
  location_investigation: MapPin,
  organization_investigation: Users,
  username_investigation: Search,
  cross_platform_search: Search,
  phone_investigation: AlertCircle,
  profile_scraping: Users
};

function FollowUpsTab({ aggregationId, username }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [executing, setExecuting] = useState(null);
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);

  useEffect(() => {
    loadFollowUps();
  }, [aggregationId]);

  const loadFollowUps = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${ENTITY_API_URL}/report/${aggregationId}/followups`);
      const data = await response.json();

      if (data.status === 'success') {
        setSuggestions(data.suggestions);
      } else {
        setError('Failed to load follow-up suggestions');
      }
    } catch (err) {
      setError('Error loading suggestions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteFollowUp = async (suggestion) => {
    setExecuting(suggestion.id);

    try {
      const action = suggestion.one_click_action;

      // Copy the query to clipboard for manual execution
      if (action && action.params) {
        const queryValue = action.params.username || action.params.email || action.params.domain || '';
        if (queryValue) {
          await navigator.clipboard.writeText(queryValue);
          alert(`Copied "${queryValue}" to clipboard!\n\nOpen the appropriate tool window and paste to search.`);
        }
      }

      // Future: Actually trigger the tool window with pre-filled data
      // This would require integration with the desktop/window management system

    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setExecuting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--theme-primary, #ff3300)' }}>
        Generating follow-up suggestions...
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

  if (!suggestions || suggestions.length === 0) {
    return (
      <div style={{ padding: '20px', color: 'var(--theme-primary, #ff3300)' }}>
        <p>No follow-up suggestions available.</p>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
          This usually means no entities were extracted from the report. Try extracting entities first from the Entities tab.
        </p>
      </div>
    );
  }

  // Group suggestions by priority
  const suggestionsByPriority = {
    HIGH: suggestions.filter(s => s.priority === 'HIGH'),
    MEDIUM: suggestions.filter(s => s.priority === 'MEDIUM'),
    LOW: suggestions.filter(s => s.priority === 'LOW')
  };

  // Filter by selected priority
  const filteredSuggestions = selectedPriority === 'all'
    ? suggestions
    : suggestionsByPriority[selectedPriority];

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '15px',
      fontFamily: 'Courier New, monospace'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: 'var(--theme-primary, #ff3300)', marginBottom: '10px', fontSize: '16px' }}>
          RECOMMENDED FOLLOW-UP INVESTIGATIONS
        </h3>
        <div style={{ fontSize: '12px', color: '#999' }}>
          Based on extracted entities from <strong style={{ color: '#00ff00' }}>{username}</strong>
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
          Total: <strong>{suggestions.length}</strong> suggestions
        </div>
      </div>

      {/* Priority Filter */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedPriority('all')}
          style={{
            padding: '5px 12px',
            backgroundColor: selectedPriority === 'all' ? 'var(--theme-primary, #ff3300)' : 'rgba(255, 51, 0, 0.2)',
            color: selectedPriority === 'all' ? '#000' : 'var(--theme-primary, #ff3300)',
            border: '1px solid var(--theme-primary, #ff3300)',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            fontSize: '11px'
          }}
        >
          All ({suggestions.length})
        </button>
        {Object.entries(suggestionsByPriority).map(([priority, items]) => {
          if (items.length === 0) return null;
          const config = PRIORITY_CONFIG[priority];
          return (
            <button
              key={priority}
              onClick={() => setSelectedPriority(priority)}
              style={{
                padding: '5px 12px',
                backgroundColor: selectedPriority === priority ? config.color : `${config.color}33`,
                color: selectedPriority === priority ? '#000' : config.color,
                border: `1px solid ${config.color}`,
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontSize: '11px'
              }}
            >
              {config.icon} {priority} ({items.length})
            </button>
          );
        })}
      </div>

      {/* Suggestions List */}
      {selectedPriority === 'all' ? (
        // Group by priority when showing all
        <>
          {Object.entries(suggestionsByPriority).map(([priority, items]) => {
            if (items.length === 0) return null;
            const config = PRIORITY_CONFIG[priority];
            return (
              <div key={priority} style={{ marginBottom: '30px' }}>
                <h4 style={{
                  color: config.color,
                  fontSize: '14px',
                  marginBottom: '15px',
                  padding: '5px 10px',
                  backgroundColor: `${config.color}22`,
                  border: `1px solid ${config.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>{config.icon}</span>
                  {config.label} ({items.length})
                </h4>
                {items.map((suggestion) => (
                  <FollowUpItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    executing={executing === suggestion.id}
                    expanded={expandedSuggestion === suggestion.id}
                    onExecute={handleExecuteFollowUp}
                    onToggleExpand={(id) => setExpandedSuggestion(expandedSuggestion === id ? null : id)}
                  />
                ))}
              </div>
            );
          })}
        </>
      ) : (
        // Show filtered list
        filteredSuggestions.map((suggestion) => (
          <FollowUpItem
            key={suggestion.id}
            suggestion={suggestion}
            executing={executing === suggestion.id}
            expanded={expandedSuggestion === suggestion.id}
            onExecute={handleExecuteFollowUp}
            onToggleExpand={(id) => setExpandedSuggestion(expandedSuggestion === id ? null : id)}
          />
        ))
      )}

      {filteredSuggestions.length === 0 && (
        <div style={{ padding: '20px', color: '#999', textAlign: 'center' }}>
          No suggestions for this priority level.
        </div>
      )}
    </div>
  );
}

function FollowUpItem({ suggestion, executing, expanded, onExecute, onToggleExpand }) {
  const priorityConfig = PRIORITY_CONFIG[suggestion.priority];
  const TypeIcon = TYPE_ICONS[suggestion.type] || Search;

  return (
    <div style={{
      marginBottom: '15px',
      padding: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${priorityConfig.color}44`,
      borderLeft: `4px solid ${priorityConfig.color}`,
      fontSize: '12px'
    }}>
      {/* Title and Execute Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <TypeIcon size={14} color={priorityConfig.color} />
            <h5 style={{ color: priorityConfig.color, fontSize: '13px', fontWeight: 'bold', margin: 0 }}>
              {suggestion.title}
            </h5>
          </div>
          <p style={{ color: '#ccc', fontSize: '11px', margin: '5px 0 0 22px' }}>
            {suggestion.description}
          </p>
        </div>

        <button
          onClick={() => onExecute(suggestion)}
          disabled={executing}
          style={{
            padding: '6px 12px',
            backgroundColor: executing ? 'rgba(255, 51, 0, 0.3)' : 'var(--theme-primary, #ff3300)',
            color: executing ? '#999' : '#000',
            border: 'none',
            cursor: executing ? 'not-allowed' : 'pointer',
            fontFamily: 'Courier New, monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            marginLeft: '10px'
          }}
        >
          {executing ? 'Executing...' : (
            suggestion.one_click_action?.button_text || 'Execute →'
          )}
        </button>
      </div>

      {/* Suggested Searches (collapsed by default) */}
      {suggestion.suggested_searches && suggestion.suggested_searches.length > 0 && (
        <div style={{ marginTop: '10px', marginLeft: '22px' }}>
          <button
            onClick={() => onToggleExpand(suggestion.id)}
            style={{
              padding: '3px 8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#999',
              border: '1px solid #333',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              fontSize: '10px',
              marginBottom: expanded ? '10px' : 0
            }}
          >
            {expanded ? '▼' : '▶'} {suggestion.suggested_searches.length} search{suggestion.suggested_searches.length > 1 ? 'es' : ''} suggested
          </button>

          {expanded && (
            <div style={{
              marginTop: '10px',
              paddingLeft: '15px',
              borderLeft: '2px solid #333'
            }}>
              {suggestion.suggested_searches.map((search, idx) => (
                <div key={idx} style={{
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid #444',
                  fontSize: '10px'
                }}>
                  <div style={{ color: '#3399ff', fontWeight: 'bold', marginBottom: '3px' }}>
                    {search.tool}
                  </div>
                  <div style={{ color: '#00ff00' }}>
                    Query: <span style={{ color: '#fff' }}>{search.query}</span>
                  </div>
                  {search.reasoning && (
                    <div style={{ color: '#999', marginTop: '3px', fontStyle: 'italic' }}>
                      {search.reasoning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entity Type Badge */}
      <div style={{
        marginTop: '10px',
        fontSize: '10px',
        color: '#666'
      }}>
        <span style={{ color: '#999' }}>Type:</span>{' '}
        <span style={{
          padding: '2px 6px',
          backgroundColor: 'rgba(51, 153, 255, 0.2)',
          border: '1px solid #3399ff',
          color: '#3399ff',
          borderRadius: '3px'
        }}>
          {suggestion.type.replace(/_/g, ' ')}
        </span>
        {suggestion.entity_type && (
          <>
            {' '}<span style={{ color: '#999' }}>|</span>{' '}
            <span style={{ color: '#999' }}>Entity:</span>{' '}
            <span style={{ color: priorityConfig.color }}>
              {suggestion.entity_type}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default FollowUpsTab;
