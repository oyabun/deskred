import { useState, useEffect } from 'react';
import { UserCircle2, Building2, Mail, Globe, MapPin, AtSign, Phone, Calendar, Tag } from 'lucide-react';
import { API_URL } from '../../config';

const ENTITY_API_URL = `${API_URL}/entities`;

// Entity type configuration with icons and colors
const ENTITY_CONFIG = {
  people: {
    icon: UserCircle2,
    color: '#00ff00',
    label: 'People'
  },
  organizations: {
    icon: Building2,
    color: '#3399ff',
    label: 'Organizations'
  },
  emails: {
    icon: Mail,
    color: '#ff9900',
    label: 'Emails'
  },
  domains: {
    icon: Globe,
    color: '#bb66ff',
    label: 'Domains'
  },
  locations: {
    icon: MapPin,
    color: '#ff3366',
    label: 'Locations'
  },
  social_handles: {
    icon: AtSign,
    color: '#00ffff',
    label: 'Social Handles'
  },
  phones: {
    icon: Phone,
    color: '#ffff00',
    label: 'Phone Numbers'
  },
  events: {
    icon: Calendar,
    color: '#ff66ff',
    label: 'Events'
  },
  keywords: {
    icon: Tag,
    color: '#66ff66',
    label: 'Keywords'
  }
};

function EntitiesTab({ aggregationId }) {
  const [entities, setEntities] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    loadEntities();
  }, [aggregationId]);

  const loadEntities = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${ENTITY_API_URL}/report/${aggregationId}`);
      const data = await response.json();

      if (data.status === 'success') {
        setEntities(data.entities);
        setStatistics(data.statistics);
      } else {
        setError('Failed to load entities');
      }
    } catch (err) {
      setError('Error loading entities: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractEntities = async () => {
    setExtracting(true);
    try {
      const response = await fetch(`${ENTITY_API_URL}/extract/${aggregationId}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.status === 'success') {
        // Reload entities
        await loadEntities();
      } else {
        setError('Failed to extract entities');
      }
    } catch (err) {
      setError('Error extracting entities: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSearchUsername = (username) => {
    // This would trigger a new Obscura search
    // For now, just copy to clipboard
    navigator.clipboard.writeText(username);
    alert(`Username "${username}" copied to clipboard!\nUse Obscura to search for it.`);
  };

  const handleCheckEmail = (email) => {
    navigator.clipboard.writeText(email);
    alert(`Email "${email}" copied to clipboard!\nUse Holehe to check for registered accounts.`);
  };

  const handleHarvestDomain = (domain) => {
    navigator.clipboard.writeText(domain);
    alert(`Domain "${domain}" copied to clipboard!\nUse TheHarvester to gather intelligence.`);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--theme-primary, #ff3300)' }}>
        Loading entities...
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

  if (!entities || !statistics) {
    return (
      <div style={{ padding: '20px', color: 'var(--theme-primary, #ff3300)' }}>
        <p>No entities extracted yet.</p>
        <button
          onClick={handleExtractEntities}
          disabled={extracting}
          style={{
            marginTop: '10px',
            padding: '8px 15px',
            backgroundColor: 'var(--theme-primary, #ff3300)',
            color: '#000',
            border: 'none',
            cursor: extracting ? 'not-allowed' : 'pointer',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            opacity: extracting ? 0.6 : 1
          }}
        >
          {extracting ? 'Extracting...' : '▶ Extract Entities'}
        </button>
      </div>
    );
  }

  const totalEntities = statistics.total_entities;

  // Filter entities by selected category
  const filteredEntities = selectedCategory === 'all'
    ? Object.entries(entities).filter(([_, items]) => items.length > 0)
    : [[selectedCategory, entities[selectedCategory] || []]];

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
          EXTRACTED ENTITIES
        </h3>
        <div style={{ fontSize: '12px', color: '#999' }}>
          Total: <strong style={{ color: '#00ff00' }}>{totalEntities}</strong> entities across{' '}
          <strong>{Object.keys(statistics.by_category).filter(k => statistics.by_category[k] > 0).length}</strong> categories
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '5px 12px',
            backgroundColor: selectedCategory === 'all' ? 'var(--theme-primary, #ff3300)' : 'rgba(255, 51, 0, 0.2)',
            color: selectedCategory === 'all' ? '#000' : 'var(--theme-primary, #ff3300)',
            border: '1px solid var(--theme-primary, #ff3300)',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            fontSize: '11px'
          }}
        >
          All ({totalEntities})
        </button>
        {Object.entries(statistics.by_category).filter(([_, count]) => count > 0).map(([category, count]) => {
          const config = ENTITY_CONFIG[category];
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '5px 12px',
                backgroundColor: selectedCategory === category ? config.color : `${config.color}33`,
                color: selectedCategory === category ? '#000' : config.color,
                border: `1px solid ${config.color}`,
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontSize: '11px'
              }}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Entity Lists */}
      {filteredEntities.map(([category, items]) => {
        if (!items || items.length === 0) return null;

        const config = ENTITY_CONFIG[category];
        const Icon = config.icon;

        return (
          <div key={category} style={{ marginBottom: '25px' }}>
            <h4 style={{
              color: config.color,
              fontSize: '14px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Icon size={16} />
              {config.label} ({items.length})
            </h4>

            <div style={{ paddingLeft: '10px' }}>
              {items.map((entity, idx) => (
                <EntityItem
                  key={idx}
                  entity={entity}
                  category={category}
                  config={config}
                  onSearchUsername={handleSearchUsername}
                  onCheckEmail={handleCheckEmail}
                  onHarvestDomain={handleHarvestDomain}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EntityItem({ entity, category, config, onSearchUsername, onCheckEmail, onHarvestDomain }) {
  const [expanded, setExpanded] = useState(false);

  // Render based on entity type
  const renderEntityValue = () => {
    switch (category) {
      case 'people':
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: config.color }}>
              {entity.name}
            </div>
            {entity.role && (
              <div style={{ fontSize: '10px', color: '#999', marginLeft: '15px' }}>
                Role: {entity.role}
              </div>
            )}
          </div>
        );

      case 'organizations':
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: config.color }}>
              {entity.name}
            </div>
            {entity.type && (
              <div style={{ fontSize: '10px', color: '#999', marginLeft: '15px' }}>
                Type: {entity.type}
              </div>
            )}
          </div>
        );

      case 'emails':
        return (
          <div style={{ color: config.color }}>
            {entity.address}
          </div>
        );

      case 'domains':
        return (
          <div style={{ color: config.color }}>
            {entity.domain}
          </div>
        );

      case 'locations':
        return (
          <div>
            <div style={{ color: config.color }}>
              {entity.location}
            </div>
            {entity.coordinates && entity.coordinates.length === 2 && (
              <div style={{ fontSize: '10px', color: '#999', marginLeft: '15px' }}>
                Coords: {entity.coordinates[0].toFixed(4)}, {entity.coordinates[1].toFixed(4)}
              </div>
            )}
          </div>
        );

      case 'social_handles':
        return (
          <div>
            <div style={{ color: config.color }}>
              {entity.username || entity.handle}
            </div>
            <div style={{ fontSize: '10px', color: '#999', marginLeft: '15px' }}>
              Platform: {entity.platform}
            </div>
          </div>
        );

      case 'phones':
        return (
          <div style={{ color: config.color }}>
            {entity.number}
          </div>
        );

      case 'events':
        return (
          <div>
            <div style={{ color: config.color }}>
              {entity.name}
            </div>
            {entity.date && (
              <div style={{ fontSize: '10px', color: '#999', marginLeft: '15px' }}>
                Date: {entity.date}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div style={{ color: config.color }}>
            {JSON.stringify(entity)}
          </div>
        );
    }
  };

  // Render action buttons based on entity type
  const renderActions = () => {
    const actions = [];

    if (category === 'people' && entity.name) {
      actions.push(
        <button
          key="search"
          onClick={() => onSearchUsername(entity.name)}
          style={{
            padding: '3px 8px',
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
            color: '#00ff00',
            border: '1px solid #00ff00',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'Courier New, monospace'
          }}
        >
          Search →
        </button>
      );
    }

    if (category === 'emails' && entity.address) {
      actions.push(
        <button
          key="check"
          onClick={() => onCheckEmail(entity.address)}
          style={{
            padding: '3px 8px',
            backgroundColor: 'rgba(255, 153, 0, 0.2)',
            color: '#ff9900',
            border: '1px solid #ff9900',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'Courier New, monospace'
          }}
        >
          Check →
        </button>
      );
    }

    if (category === 'domains' && entity.domain) {
      actions.push(
        <button
          key="harvest"
          onClick={() => onHarvestDomain(entity.domain)}
          style={{
            padding: '3px 8px',
            backgroundColor: 'rgba(153, 51, 255, 0.2)',
            color: '#9933ff',
            border: '1px solid #9933ff',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'Courier New, monospace'
          }}
        >
          Harvest →
        </button>
      );
    }

    if (category === 'social_handles' && entity.username) {
      actions.push(
        <button
          key="search-handle"
          onClick={() => onSearchUsername(entity.username)}
          style={{
            padding: '3px 8px',
            backgroundColor: 'rgba(0, 255, 255, 0.2)',
            color: '#00ffff',
            border: '1px solid #00ffff',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'Courier New, monospace'
          }}
        >
          Search →
        </button>
      );
    }

    return actions;
  };

  return (
    <div style={{
      marginBottom: '10px',
      padding: '10px',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${config.color}33`,
      fontSize: '11px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {renderEntityValue()}
          <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
            Source: {entity.source}
            {entity.confidence && ` | Confidence: ${(entity.confidence * 100).toFixed(0)}%`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
          {renderActions()}
          {Object.keys(entity).length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: '3px 8px',
                backgroundColor: 'rgba(255, 51, 0, 0.2)',
                color: 'var(--theme-primary, #ff3300)',
                border: '1px solid var(--theme-primary, #ff3300)',
                cursor: 'pointer',
                fontSize: '10px',
                fontFamily: 'Courier New, monospace'
              }}
            >
              {expanded ? '▼' : '▶'}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid #333',
          fontSize: '10px',
          color: '#999'
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(entity, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default EntitiesTab;
