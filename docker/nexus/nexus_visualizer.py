#!/usr/bin/env python3
"""
Nexus - OSINT Data Visualizer
Generates interactive graphs from Obscura report data
"""
import json
import sys
import networkx as nx
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from collections import Counter
import re


def categorize_platform(site):
    """Categorize platform by type"""
    site_lower = site.lower()

    categories = {
        'Social Media': ['twitter', 'facebook', 'instagram', 'tiktok', 'snapchat', 'linkedin', 'reddit', 'mastodon'],
        'Professional': ['linkedin', 'github', 'gitlab', 'stackoverflow', 'behance', 'dribbble', 'deviantart'],
        'Gaming': ['steam', 'xbox', 'playstation', 'twitch', 'discord', 'epicgames', 'chess.com', 'boardgamegeek'],
        'Media': ['youtube', 'vimeo', 'soundcloud', 'spotify', 'bandcamp', 'mixcloud', 'audiojungle'],
        'Forums': ['reddit', 'hackernews', 'bbpress', 'discourse'],
        'Finance': ['cash.app', 'paypal', 'venmo', 'patreon'],
        'Creative': ['behance', 'dribbble', 'deviantart', 'artstation', 'codepen', 'themeforest'],
        'Other': []
    }

    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in site_lower:
                return category

    return 'Other'


def extract_country(profile):
    """Extract country from profile metadata"""
    metadata = profile.get('metadata', {})

    # Look for country in metadata
    for key, value in metadata.items():
        if 'country' in key.lower():
            return value

    # Try to extract from profile data if available
    if 'country' in metadata:
        return metadata['country']

    return 'Unknown'


def create_network_graph(report_data, username):
    """Create network graph showing connections"""
    G = nx.Graph()

    # Add center node (username)
    G.add_node(username, node_type='user', size=50)

    # Add platform nodes and edges
    for profile in report_data['all_profiles']:
        site = profile['site']
        category = categorize_platform(site)

        G.add_node(site, node_type='platform', category=category, size=20)
        G.add_edge(username, site)

    # Generate layout
    pos = nx.spring_layout(G, k=2, iterations=50)

    # Create edge traces
    edge_x = []
    edge_y = []
    for edge in G.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    edge_trace = go.Scatter(
        x=edge_x, y=edge_y,
        line=dict(width=1, color='#ff3300'),
        hoverinfo='none',
        mode='lines',
        opacity=0.5
    )

    # Create node traces by category
    categories = {}
    for node in G.nodes():
        node_type = G.nodes[node].get('node_type')

        if node_type == 'user':
            category = 'Username'
        else:
            category = G.nodes[node].get('category', 'Other')

        if category not in categories:
            categories[category] = {'x': [], 'y': [], 'text': [], 'size': []}

        x, y = pos[node]
        categories[category]['x'].append(x)
        categories[category]['y'].append(y)
        categories[category]['text'].append(node)
        categories[category]['size'].append(G.nodes[node].get('size', 20))

    # Create traces for each category
    node_traces = []
    colors = {
        'Username': '#00ff00',
        'Social Media': '#ff6b6b',
        'Professional': '#4ecdc4',
        'Gaming': '#95e1d3',
        'Media': '#f38181',
        'Forums': '#aa96da',
        'Finance': '#fcbad3',
        'Creative': '#ffffd2',
        'Other': '#999999'
    }

    for category, data in categories.items():
        node_trace = go.Scatter(
            x=data['x'], y=data['y'],
            mode='markers+text',
            hoverinfo='text',
            text=data['text'],
            textposition="top center",
            textfont=dict(size=8, color='#ff3300'),
            name=category,
            marker=dict(
                color=colors.get(category, '#999999'),
                size=data['size'],
                line=dict(width=2, color='#160909')
            )
        )
        node_traces.append(node_trace)

    # Create figure
    fig = go.Figure(data=[edge_trace] + node_traces,
                    layout=go.Layout(
                        title=dict(
                            text=f'<b>Profile Network - {username}</b>',
                            font=dict(size=20, color='#ff3300')
                        ),
                        showlegend=True,
                        hovermode='closest',
                        margin=dict(b=0, l=0, r=0, t=40),
                        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                        plot_bgcolor='#0a0000',
                        paper_bgcolor='#160909',
                        font=dict(color='#ff3300'),
                        legend=dict(
                            bgcolor='rgba(26, 1, 2, 0.8)',
                            bordercolor='#ff3300',
                            borderwidth=1
                        )
                    ))

    return fig


def create_category_breakdown(report_data):
    """Create pie chart of platform categories"""
    categories = Counter()

    for profile in report_data['all_profiles']:
        category = categorize_platform(profile['site'])
        categories[category] += 1

    fig = go.Figure(data=[go.Pie(
        labels=list(categories.keys()),
        values=list(categories.values()),
        hole=0.3,
        marker=dict(
            colors=['#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181', '#aa96da', '#fcbad3', '#ffffd2', '#999999'],
            line=dict(color='#160909', width=2)
        ),
        textfont=dict(size=12, color='#ffffff')
    )])

    fig.update_layout(
        title=dict(
            text='<b>Platform Categories</b>',
            font=dict(size=20, color='#ff3300')
        ),
        plot_bgcolor='#0a0000',
        paper_bgcolor='#160909',
        font=dict(color='#ff3300'),
        showlegend=True,
        legend=dict(
            bgcolor='rgba(26, 1, 2, 0.8)',
            bordercolor='#ff3300',
            borderwidth=1
        )
    )

    return fig


def create_platform_bar_chart(report_data):
    """Create bar chart of profiles by platform"""
    platform_counts = Counter()

    for profile in report_data['all_profiles']:
        platform_counts[profile['site']] += 1

    # Get top 20 platforms
    top_platforms = platform_counts.most_common(20)
    platforms = [p[0] for p in top_platforms]
    counts = [p[1] for p in top_platforms]

    fig = go.Figure(data=[go.Bar(
        x=platforms,
        y=counts,
        marker=dict(
            color='#ff3300',
            line=dict(color='#160909', width=1)
        ),
        text=counts,
        textposition='auto',
    )])

    fig.update_layout(
        title=dict(
            text='<b>Top 20 Platforms</b>',
            font=dict(size=20, color='#ff3300')
        ),
        xaxis=dict(
            title='Platform',
            tickangle=-45,
            color='#ff3300',
            gridcolor='#330000'
        ),
        yaxis=dict(
            title='Count',
            color='#ff3300',
            gridcolor='#330000'
        ),
        plot_bgcolor='#0a0000',
        paper_bgcolor='#160909',
        font=dict(color='#ff3300')
    )

    return fig


def create_tool_comparison(report_data):
    """Create comparison of tools' findings"""
    tool_names = []
    tool_counts = []

    for tool_result in report_data['by_tool']:
        tool_names.append(tool_result['tool'])
        tool_counts.append(tool_result['found'])

    fig = go.Figure(data=[go.Bar(
        x=tool_names,
        y=tool_counts,
        marker=dict(
            color=['#ff3300', '#00ff00', '#3399ff', '#ff00ff', '#ffff00'],
            line=dict(color='#160909', width=1)
        ),
        text=tool_counts,
        textposition='auto',
    )])

    fig.update_layout(
        title=dict(
            text='<b>Findings by Tool</b>',
            font=dict(size=20, color='#ff3300')
        ),
        xaxis=dict(
            title='Tool',
            color='#ff3300',
            gridcolor='#330000'
        ),
        yaxis=dict(
            title='Profiles Found',
            color='#ff3300',
            gridcolor='#330000'
        ),
        plot_bgcolor='#0a0000',
        paper_bgcolor='#160909',
        font=dict(color='#ff3300')
    )

    return fig


def generate_visualizations(report_json, username):
    """Generate all visualizations from report data"""
    try:
        report_data = json.loads(report_json)

        if not report_data.get('all_profiles'):
            print(json.dumps({
                "status": "error",
                "message": "No profiles found in report"
            }))
            return

        # Generate individual graphs
        network_fig = create_network_graph(report_data, username)
        category_fig = create_category_breakdown(report_data)
        platform_fig = create_platform_bar_chart(report_data)
        tool_fig = create_tool_comparison(report_data)

        # Convert to JSON for web display
        graphs = {
            "network": json.loads(network_fig.to_json()),
            "categories": json.loads(category_fig.to_json()),
            "platforms": json.loads(platform_fig.to_json()),
            "tools": json.loads(tool_fig.to_json())
        }

        # Output results
        result = {
            "status": "success",
            "username": username,
            "summary": {
                "total_profiles": len(report_data['all_profiles']),
                "unique_sites": report_data['summary']['unique_sites'],
                "tools_run": report_data['summary']['tools_run']
            },
            "graphs": graphs
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": str(e)
        }))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "status": "error",
            "message": "Usage: nexus_visualizer.py <report_json> <username>"
        }))
        sys.exit(1)

    report_json = sys.argv[1]
    username = sys.argv[2]

    generate_visualizations(report_json, username)
