import { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { API_URL } from '../../config';

function AccountHunterTool() {
  const [username, setUsername] = useState('');
  const [aggregationId, setAggregationId] = useState(null);
  const [aggregationStatus, setAggregationStatus] = useState(null);
  const [toolLogs, setToolLogs] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTool, setSelectedTool] = useState('all');
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'report', or 'visualize'
  const [report, setReport] = useState(null);
  const [visualizations, setVisualizations] = useState(null);
  const [vizLoading, setVizLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const statusIntervalRef = useRef(null);
  const logsIntervalRef = useRef(null);

  const toolNames = {
    'maigret': 'Maigret',
    'sherlock': 'Sherlock',
    'social-analyzer': 'Social Analyzer',
    'digitalfootprint': 'Digital Footprint',
    'gosearch': 'GoSearch'
  };

  const categories = {
    'Social Media': ['twitter', 'facebook', 'instagram', 'tiktok', 'snapchat', 'linkedin', 'reddit', 'mastodon', 'telegram', 'whatsapp', 'signal'],
    'Professional': ['linkedin', 'github', 'gitlab', 'stackoverflow', 'behance', 'dribbble', 'deviantart', 'freelancer', 'upwork', 'fiverr'],
    'Gaming': ['steam', 'xbox', 'playstation', 'twitch', 'discord', 'epicgames', 'chess.com', 'boardgamegeek', 'roblox', 'minecraft'],
    'Media': ['youtube', 'vimeo', 'soundcloud', 'spotify', 'bandcamp', 'mixcloud', 'audiojungle', 'podcast', 'medium'],
    'Forums': ['reddit', 'hackernews', 'bbpress', 'discourse', 'quora', '4chan', '8chan'],
    'Finance': ['cash.app', 'paypal', 'venmo', 'patreon', 'cashapp', 'bitcoin', 'crypto', 'binance', 'coinbase'],
    'Creative': ['behance', 'dribbble', 'deviantart', 'artstation', 'codepen', 'themeforest', 'etsy', 'redbubble'],
    'Dating': ['tinder', 'bumble', 'hinge', 'okcupid', 'match', 'pof', 'badoo', 'grindr', 'lovoo', 'meetme', 'dating'],
    'Adult': ['onlyfans', 'pornhub', 'xvideos', 'xhamster', 'chaturbate', 'stripchat', 'cam4', 'myfreecams', 'adult', 'nsfw', 'xxx', 'porn', 'fetlife'],
    'Shopping': ['amazon', 'ebay', 'etsy', 'aliexpress', 'wish', 'mercari', 'poshmark', 'depop', 'shop'],
    'Travel': ['airbnb', 'booking', 'tripadvisor', 'expedia', 'hotels', 'skyscanner', 'hostelworld'],
    'Education': ['coursera', 'udemy', 'edx', 'khan', 'duolingo', 'skillshare', 'codecademy', 'education'],
    'Business': ['crunchbase', 'angellist', 'producthunt', 'yelp', 'glassdoor', 'trustpilot', 'business'],
    'Other': []
  };

  const categorizeSite = (site) => {
    const siteLower = site.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (siteLower.includes(keyword)) {
          return category;
        }
      }
    }
    return 'Other';
  };

  const getFilteredProfiles = () => {
    if (!report || !report.by_site) return {};

    if (selectedCategory === 'all') {
      return report.by_site;
    }

    const filtered = {};
    for (const [site, profiles] of Object.entries(report.by_site)) {
      const category = categorizeSite(site);
      if (category === selectedCategory) {
        filtered[site] = profiles;
      }
    }
    return filtered;
  };

  useEffect(() => {
    if (aggregationId && isRunning) {
      // Poll for status updates
      const fetchStatus = async () => {
        try {
          const response = await fetch(`${API_URL}/api/account-hunter/status/${aggregationId}`);
          const data = await response.json();

          if (data.status === 'success') {
            setAggregationStatus(data);

            // Stop polling if all tools completed
            if (data.summary.running === 0) {
              setIsRunning(false);
              if (statusIntervalRef.current) {
                clearInterval(statusIntervalRef.current);
                statusIntervalRef.current = null;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching status:', error);
        }
      };

      // Poll for logs
      const fetchLogs = async () => {
        try {
          const response = await fetch(`${API_URL}/api/account-hunter/logs/${aggregationId}`);
          const data = await response.json();

          if (data.status === 'success') {
            setToolLogs(data.logs);
          }
        } catch (error) {
          console.error('Error fetching logs:', error);
        }
      };

      // Initial fetch
      fetchStatus();
      fetchLogs();

      // Set up intervals
      statusIntervalRef.current = setInterval(fetchStatus, 2000);
      logsIntervalRef.current = setInterval(fetchLogs, 3000);

      return () => {
        if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
        if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
      };
    }
  }, [aggregationId, isRunning]);

  const handleSearch = async () => {
    if (!username.trim()) return;

    setIsRunning(true);
    setAggregationId(null);
    setAggregationStatus(null);
    setToolLogs({});

    try {
      const response = await fetch(`${API_URL}/api/account-hunter/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setAggregationId(data.aggregation_id);
      }
    } catch (error) {
      console.error('Error starting search:', error);
      setIsRunning(false);
    }
  };

  const getToolStatus = (toolId) => {
    if (!aggregationStatus || !aggregationStatus.aggregation.tools[toolId]) {
      return 'pending';
    }
    return aggregationStatus.aggregation.tools[toolId].status;
  };

  const getToolStatusColor = (status) => {
    switch (status) {
      case 'running': return '#3399ff';
      case 'completed': return '#00ff00';
      case 'error': return '#ff0000';
      default: return '#666';
    }
  };

  const formatLogs = (logs) => {
    if (!logs) return '';
    return logs.split('\n').filter(line => line.trim()).join('\n');
  };

  const fetchReport = async () => {
    if (!aggregationId) return;

    try {
      const response = await fetch(`${API_URL}/api/account-hunter/report/${aggregationId}`);
      const data = await response.json();

      if (data.status === 'success') {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const fetchVisualizations = async () => {
    if (!aggregationId) return;

    setVizLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/account-hunter/visualize/${aggregationId}`);
      const data = await response.json();

      if (data.status === 'success') {
        setVisualizations(data.visualizations.graphs);
      } else {
        console.error('Visualization error:', data.message);
      }
    } catch (error) {
      console.error('Error fetching visualizations:', error);
    } finally {
      setVizLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          color: 'var(--theme-primary, #ff3300)',
          fontFamily: 'Fira Mono, monospace',
          fontSize: '14px',
        }}>
          Username to Hunt:
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter username"
            disabled={isRunning}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'var(--theme-bg, #0a0000)',
              border: '1px solid var(--theme-primary, #ff3300)',
              color: 'var(--theme-primary, #ff3300)',
              fontFamily: 'Fira Mono, monospace',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isRunning || !username.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: isRunning ? '#666' : '#ff3300',
              border: 'none',
              color: 'var(--theme-bg, #0a0000)',
              fontFamily: 'Fira Mono, monospace',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? 'Hunting...' : 'Hunt Accounts'}
          </button>
        </div>
      </div>

      {aggregationStatus && (
        <div>
          <div style={{
            padding: '15px',
            backgroundColor: 'rgba(var(--theme-primary-rgb, 255, 51, 0), 0.1)',
            border: '1px solid var(--theme-primary, #ff3300)',
            marginBottom: '20px',
          }}>
            <h3 style={{ color: 'var(--theme-primary, #ff3300)', margin: '0 0 10px 0', fontSize: '16px' }}>
              Aggregation Status
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--theme-primary, #ff3300)' }}>
              <div>Username: <strong>{aggregationStatus.aggregation.username}</strong></div>
              <div>Total Tools: {aggregationStatus.summary.total_tools}</div>
              <div style={{ color: '#3399ff' }}>Running: {aggregationStatus.summary.running}</div>
              <div style={{ color: '#00ff00' }}>Completed: {aggregationStatus.summary.completed}</div>
              {aggregationStatus.summary.errors > 0 && (
                <div style={{ color: '#ff0000' }}>Errors: {aggregationStatus.summary.errors}</div>
              )}
            </div>
          </div>

          {/* Tab Buttons */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('status')}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === 'status' ? '#ff3300' : 'transparent',
                border: '1px solid var(--theme-primary, #ff3300)',
                color: activeTab === 'status' ? 'var(--theme-bg, #0a0000)' : '#ff3300',
                fontFamily: 'Fira Mono, monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Status & Logs
            </button>
            <button
              onClick={() => {
                setActiveTab('report');
                fetchReport();
              }}
              disabled={aggregationStatus.summary.running > 0}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === 'report' ? '#ff3300' : 'transparent',
                border: '1px solid var(--theme-primary, #ff3300)',
                color: activeTab === 'report' ? 'var(--theme-bg, #0a0000)' : '#ff3300',
                fontFamily: 'Fira Mono, monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: aggregationStatus.summary.running > 0 ? 'not-allowed' : 'pointer',
                opacity: aggregationStatus.summary.running > 0 ? 0.5 : 1,
              }}
            >
              Report
            </button>
            <button
              onClick={() => {
                setActiveTab('visualize');
                fetchVisualizations();
              }}
              disabled={aggregationStatus.summary.running > 0}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === 'visualize' ? '#ff3300' : 'transparent',
                border: '1px solid var(--theme-primary, #ff3300)',
                color: activeTab === 'visualize' ? 'var(--theme-bg, #0a0000)' : '#ff3300',
                fontFamily: 'Fira Mono, monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: aggregationStatus.summary.running > 0 ? 'not-allowed' : 'pointer',
                opacity: aggregationStatus.summary.running > 0 ? 0.5 : 1,
              }}
            >
              Visualizations
            </button>
          </div>

          {activeTab === 'status' && (
            <>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px', marginRight: '10px' }}>
                  View Logs:
                </label>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: 'var(--theme-bg, #0a0000)',
                    border: '1px solid var(--theme-primary, #ff3300)',
                    color: 'var(--theme-primary, #ff3300)',
                    fontFamily: 'Fira Mono, monospace',
                    fontSize: '12px',
                  }}
                >
                  <option value="all">All Tools</option>
                  {Object.keys(toolNames).map(toolId => (
                    <option key={toolId} value={toolId}>{toolNames[toolId]}</option>
                  ))}
                </select>
              </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            marginBottom: '20px',
          }}>
            {Object.entries(toolNames).map(([toolId, toolName]) => {
              const status = getToolStatus(toolId);
              return (
                <div
                  key={toolId}
                  style={{
                    padding: '10px',
                    border: '1px solid ' + getToolStatusColor(status),
                    backgroundColor: 'rgba(255, 51, 0, 0.05)',
                  }}
                >
                  <div style={{
                    color: getToolStatusColor(status),
                    fontFamily: 'Fira Mono, monospace',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}>
                    {toolName}
                  </div>
                  <div style={{
                    color: getToolStatusColor(status),
                    fontFamily: 'Fira Mono, monospace',
                    fontSize: '11px',
                    marginTop: '5px',
                  }}>
                    {status}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            border: '1px solid var(--theme-primary, #ff3300)',
            backgroundColor: 'var(--theme-bg, #0a0000)',
            padding: '15px',
            maxHeight: '400px',
            overflow: 'auto',
          }}>
            <h4 style={{ color: 'var(--theme-primary, #ff3300)', margin: '0 0 10px 0', fontSize: '14px' }}>
              {selectedTool === 'all' ? 'All Logs' : `${toolNames[selectedTool]} Logs`}
            </h4>
            <pre style={{
              color: 'var(--theme-primary, #ff3300)',
              fontFamily: 'Fira Mono, monospace',
              fontSize: '11px',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}>
              {selectedTool === 'all' ? (
                Object.entries(toolLogs).map(([toolId, logData]) => (
                  <div key={toolId} style={{ marginBottom: '20px' }}>
                    <div style={{ color: '#3399ff', fontWeight: 'bold', marginBottom: '5px' }}>
                      === {toolNames[toolId]} ===
                    </div>
                    {logData.logs ? formatLogs(logData.logs) : 'No logs yet...'}
                  </div>
                ))
              ) : (
                toolLogs[selectedTool] && toolLogs[selectedTool].logs ?
                  formatLogs(toolLogs[selectedTool].logs) :
                  'No logs yet...'
              )}
            </pre>
          </div>
            </>
          )}

          {activeTab === 'report' && (
            <div style={{
              border: '1px solid var(--theme-primary, #ff3300)',
              backgroundColor: 'var(--theme-bg, #0a0000)',
              padding: '20px',
            }}>
              {report ? (
                <div>
                  <h3 style={{ color: 'var(--theme-primary, #ff3300)', marginTop: 0, fontSize: '16px' }}>
                    OBSCURA REPORT - SUMMARY
                  </h3>
                  <div style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px', marginBottom: '20px' }}>
                    <div>Total Profiles Found: <strong>{report.summary.total_profiles_found}</strong></div>
                    <div>Unique Sites: <strong>{report.summary.unique_sites}</strong></div>
                    <div>Tools Run: {report.summary.tools_run}</div>
                    <div>Tools with Results: {report.summary.tools_with_results}</div>
                  </div>

                  <h3 style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '16px' }}>
                    RESULTS BY TOOL
                  </h3>
                  <div style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px', marginBottom: '20px' }}>
                    {report.by_tool.map((toolResult, idx) => (
                      <div key={idx} style={{ marginBottom: '5px' }}>
                        [{toolResult.tool}] Found: <strong>{toolResult.found}</strong>
                      </div>
                    ))}
                  </div>

                  {report.all_profiles && report.all_profiles.length > 0 ? (
                    <>
                      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '16px', margin: 0 }}>
                          FOUND PROFILES
                        </h3>
                        <label style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px', marginLeft: '20px' }}>
                          Filter by Category:
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: 'var(--theme-bg, #0a0000)',
                            border: '1px solid var(--theme-primary, #ff3300)',
                            color: 'var(--theme-primary, #ff3300)',
                            fontFamily: 'Fira Mono, monospace',
                            fontSize: '12px',
                          }}
                        >
                          <option value="all">All Categories ({report.all_profiles.length})</option>
                          {Object.keys(categories).map(category => {
                            const count = Object.entries(report.by_site).filter(([site]) =>
                              categorizeSite(site) === category
                            ).length;
                            return count > 0 ? (
                              <option key={category} value={category}>
                                {category} ({count})
                              </option>
                            ) : null;
                          })}
                        </select>
                      </div>
                      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                        {Object.entries(getFilteredProfiles()).map(([site, profiles]) => (
                          <div key={site} style={{ marginBottom: '20px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              marginBottom: '10px',
                            }}>
                              <div style={{
                                color: '#3399ff',
                                fontSize: '13px',
                                fontWeight: 'bold',
                              }}>
                                [{site}]
                              </div>
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                backgroundColor: 'rgba(var(--theme-primary-rgb, 255, 51, 0), 0.2)',
                                border: '1px solid var(--theme-primary, #ff3300)',
                                color: 'var(--theme-primary, #ff3300)',
                                borderRadius: '3px',
                              }}>
                                {categorizeSite(site)}
                              </span>
                            </div>
                            {profiles.map((profile, idx) => (
                              <div key={idx} style={{
                                marginBottom: '10px',
                                paddingLeft: '20px',
                                fontSize: '11px',
                              }}>
                                <a
                                  href={profile.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--theme-primary, #ff3300)', textDecoration: 'underline' }}
                                >
                                  {profile.url}
                                </a>
                                {profile.metadata && Object.keys(profile.metadata).length > 0 && (
                                  <div style={{ marginTop: '5px', paddingLeft: '20px', color: '#999' }}>
                                    {Object.entries(profile.metadata).map(([key, value]) => (
                                      <div key={key}>
                                        {key}: {value}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px' }}>
                      No profiles found.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px' }}>
                  Loading report...
                </div>
              )}
            </div>
          )}

          {activeTab === 'visualize' && (
            <div style={{
              border: '1px solid var(--theme-primary, #ff3300)',
              backgroundColor: 'var(--theme-bg, #0a0000)',
              padding: '20px',
            }}>
              {vizLoading ? (
                <div style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px' }}>
                  Generating visualizations...
                </div>
              ) : visualizations ? (
                <div>
                  <h3 style={{ color: 'var(--theme-primary, #ff3300)', marginTop: 0, fontSize: '16px' }}>
                    NEXUS VISUALIZATIONS
                  </h3>

                  {/* Network Graph */}
                  <div style={{ marginBottom: '40px' }}>
                    <h4 style={{ color: '#3399ff', fontSize: '14px' }}>Profile Network</h4>
                    <Plot
                      data={visualizations.network.data}
                      layout={{
                        ...visualizations.network.layout,
                        autosize: true,
                      }}
                      config={{ responsive: true, displayModeBar: false }}
                      style={{ width: '100%', height: '500px' }}
                    />
                  </div>

                  {/* Category Breakdown */}
                  <div style={{ marginBottom: '40px' }}>
                    <h4 style={{ color: '#3399ff', fontSize: '14px' }}>Platform Categories</h4>
                    <Plot
                      data={visualizations.categories.data}
                      layout={{
                        ...visualizations.categories.layout,
                        autosize: true,
                      }}
                      config={{ responsive: true, displayModeBar: false }}
                      style={{ width: '100%', height: '400px' }}
                    />
                  </div>

                  {/* Platform Bar Chart */}
                  <div style={{ marginBottom: '40px' }}>
                    <h4 style={{ color: '#3399ff', fontSize: '14px' }}>Top Platforms</h4>
                    <Plot
                      data={visualizations.platforms.data}
                      layout={{
                        ...visualizations.platforms.layout,
                        autosize: true,
                      }}
                      config={{ responsive: true, displayModeBar: false }}
                      style={{ width: '100%', height: '400px' }}
                    />
                  </div>

                  {/* Tool Comparison */}
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: '#3399ff', fontSize: '14px' }}>Findings by Tool</h4>
                    <Plot
                      data={visualizations.tools.data}
                      layout={{
                        ...visualizations.tools.layout,
                        autosize: true,
                      }}
                      config={{ responsive: true, displayModeBar: false }}
                      style={{ width: '100%', height: '400px' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--theme-primary, #ff3300)', fontSize: '12px' }}>
                  No visualizations available.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountHunterTool;
