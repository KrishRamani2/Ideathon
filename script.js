// ==================== UTILITIES & STATE ====================
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const RF = (a, b) => Math.random() * (b - a) + a;
const pick = a => a[R(0, a.length - 1)];
const fmt = n => n >= 1e7 ? '₹' + (n / 1e7).toFixed(1) + 'Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + 'L' : '₹' + n.toLocaleString('en-IN');
let crazyMode = false, themePulse = false;

function escapeHtml(input) {
    return String(input ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==================== DATA LOAD STATE ====================
let globalCSVData = null;
function hasCSVData() {
    return Array.isArray(globalCSVData) && globalCSVData.length > 0;
}

// ==================== PROFILE DIRECTORY (HARDCODED) ====================
// Used by the Profile Scanner + chatbot narration.
const PROFILE_DIRECTORY = [
    { id: 'C335', type: 'Corporate' },
    { id: 'C352', type: 'Individual' },
    { id: 'C326', type: 'Corporate' },
    { id: 'C054', type: 'Corporate' },
    { id: 'C365', type: 'Corporate' },
    { id: 'S146', type: 'Corporate' },
    { id: 'C204', type: 'Corporate' },
    { id: 'C268', type: 'Individual' },
    { id: 'C314', type: 'Individual' },
    { id: 'C016', type: 'Individual' },
    { id: 'S130', type: 'Individual' },
    { id: 'C292', type: 'Individual' },
];

const PROFILE_TYPE_BY_ID = new Map(PROFILE_DIRECTORY.map(e => [e.id, e.type]));
function getEntityType(entityId) {
    const id = String(entityId ?? '');
    if (PROFILE_TYPE_BY_ID.has(id)) return PROFILE_TYPE_BY_ID.get(id);
    if (/^SHELL_/i.test(id) || /^MERCHANT_/i.test(id)) return 'Corporate';
    if (/^ACCOUNT_/i.test(id) || /^NORMAL_/i.test(id)) return 'Individual';
    if (/^C\d+/i.test(id)) return 'Corporate';
    return 'Entity';
}

function renderEmptyState() {
    // Dashboard (overview)
    ['statsGrid', 'dash-velocity', 'mini-graph', 'dash-donut', 'dash-radar', 'dash-sankey'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // Anomalies
    ['anomalyStatsGrid', 'anomaly-bar-chart', 'anomaly-timeline', 'anomaly-types-pie', 'anomaly-types-desc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // Metrics
    ['linechart-container', 'sankey-container', 'bubble-chart'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // Heatmap
    const heat = document.getElementById('heatmap-container');
    if (heat) heat.innerHTML = '';

    // Risk
    ['riskOverviewGrid', 'risk-trend-chart', 'risk-category-chart'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // Alerts + profiles
    ['alertFeed', 'riskAlertList', 'profileArea'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // Fraud section
    const fraudGraph = document.getElementById('fraud-network-graph');
    if (fraudGraph) fraudGraph.innerHTML = '';
    ['fraudRiskScore', 'fraudEntities', 'fraudLinks'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

// ==================== THEME MANAGEMENT ====================
function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }

function toggleTheme() {
    const html = document.documentElement;
    const curr = getTheme();
    const next = curr === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('fundsentinel-theme', next);

    // Update icons and labels
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.className = next === 'dark' ? 'ri-moon-line' : 'ri-sun-line';
    if (label) label.textContent = next === 'dark' ? 'Light' : 'Dark';

    // Re-render complex charts for color updates (only after CSV import)
    if (!hasCSVData()) {
        renderEmptyState();
        return;
    }

    if (window._graphInit) { initForceGraph(); }
    if (window._heatInit) { initFullHeatmap(); }
    if (window._fraudInit) { updateDashboardWithCSV(); }
    if (window._metricsInit) { initLineChart(); initSankey(); initBubbleChart(); }
    renderMiniGraphs();
}

(function initTheme() {
    const saved = localStorage.getItem('fundsentinel-theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        const icon = document.getElementById('themeIcon');
        const label = document.getElementById('themeLabel');
        if (icon) icon.className = saved === 'dark' ? 'ri-moon-line' : 'ri-sun-line';
        if (label) label.textContent = saved === 'dark' ? 'Light' : 'Dark';
    }
})();

// ==================== CLOCK ====================
function updateClock() {
    const now = new Date();
    const el = document.getElementById('headerClock');
    if (el) el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} IST`;
}
setInterval(updateClock, 1000); updateClock();

// ==================== THREE.JS GLOBE ====================
(function initThreeGlobe() {
    const canvas = document.getElementById('three-bg'); if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // Green wireframe globe
    const globeGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const globeMat = new THREE.MeshBasicMaterial({ color: 0x00e676, wireframe: true, transparent: true, opacity: 0.15 });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.position.set(1.2, -0.3, 0);
    scene.add(globe);

    // Dynamic dots (particles)
    const dotGeo = new THREE.BufferGeometry();
    const dotPositions = new Float32Array(300 * 3);
    for (let i = 0; i < 300 * 3; i++) dotPositions[i] = (Math.random() - 0.5) * 14;
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
    const dotMat = new THREE.PointsMaterial({ color: 0x00e676, size: 0.02, transparent: true, opacity: 0.4 });
    const dots = new THREE.Points(dotGeo, dotMat);
    scene.add(dots);

    function animate() {
        requestAnimationFrame(animate);
        const speed = crazyMode ? 0.008 : 0.002;
        globe.rotation.y += speed; globe.rotation.x += speed * 0.1;
        dots.rotation.y += speed;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();

// ==================== SIDEBAR & UTILS ====================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    // Trigger window resize to adjust charts
    setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
}

function switchSection(id, el) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const sec = document.getElementById('sec-' + id);
    if (sec) sec.classList.add('active');
    if (el) el.classList.add('active');

    // Lazy Load Initialization (only after CSV import)
    if (!hasCSVData()) {
        renderEmptyState();
        return;
    }

    if (id === 'fundflows' && !window._graphInit) { initForceGraph(); window._graphInit = true; }
    if (id === 'metrics' && !window._metricsInit) { initSankey(); initBubbleChart(); window._metricsInit = true; }
    if (id === 'heatmap' && !window._heatInit) { initFullHeatmap(); window._heatInit = true; }
    if (id === 'fraud' && !window._fraudInit) {
        // If CSV exists, keep the fraud graph driven by imported data.
        updateDashboardWithCSV();
        window._fraudInit = true;
    }
}

function toggleCrazy() {
    crazyMode = !crazyMode;
    document.body.classList.toggle('crazy', crazyMode);
    document.getElementById('crazyBtn').classList.toggle('on', crazyMode);
}

function refreshData() {
    if (!hasCSVData()) {
        renderEmptyState();
        return;
    }

    // Recompute any data-driven panels first
    updateDashboardWithCSV();

    // Re-render the rest of the visuals (these are still mostly mock visuals)
    renderMiniGraphs();
    initLineChart();
    initSankey();
    initBubbleChart();
    renderRiskSection();
    renderAnomalyCharts();
}

function exportViz() {
    alert('Generating PDF Report... Please wait.');
    const el = document.querySelector('.main-content') || document.body;
    const opt = {
        margin: 5,
        filename: 'FundSentinel_Dashboard_Report.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: true, backgroundColor: document.documentElement.getAttribute('data-theme')==='dark'?'#0a0b10':'#f4f6f8' },
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(el).save().then(() => {
        attachToChatbot('FundSentinel_Dashboard_Report.pdf');
    });
}

function attachToChatbot(filename) {
    if(typeof _chatOpen !== 'undefined' && !_chatOpen) {
        if(typeof toggleChatbot === 'function') toggleChatbot();
    }
    const body = document.getElementById('chatBody');
    if(!body) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg bot`;
    msgDiv.innerHTML = `<div class="msg-bubble" style="display:flex; align-items:flex-start; gap:12px; border-left:3px solid var(--accent); background:var(--surface); border:1px solid var(--border);">
        <i class="ri-file-pdf-2-fill" style="color:var(--red); font-size:24px; margin-top:2px;"></i> 
        <div>
            <strong style="color:var(--text); font-family:var(--font-mono); font-size:12px;">${filename} attached successfully.</strong>
            <p style="margin:4px 0 0 0; font-size:11px; color:var(--text-dim); line-height:1.4;">I have comprehensively scanned the exported dashboard metrics. You can now prompt me regarding any anomalies, risk triggers, or fund flows inside this snapshot.</p>
        </div>
    </div>`;
    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight;
}

// ==================== FRAUD DETECTION (IMAGE REPLICA) ====================
function initFraudGraph() {
    const container = document.getElementById('fraud-network-graph');
    if (!container) return;
    container.innerHTML = '';

    const isDark = getTheme() === 'dark';
    const w = container.clientWidth || 800, h = container.clientHeight || 500;
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
    const g = svg.append('g');

    svg.call(d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform)));

    // Generate Nodes akin to the image
    const nodes = [];
    const edges = [];

    // Core nodes for the highlighted pattern
    nodes.push({ id: 'C135', label: 'C135', risk: 0, isQuery: true, highlight: false });
    nodes.push({ id: 'C330', label: 'C330', risk: 0, isQuery: true, highlight: true }); // Big blue node
    nodes.push({ id: 'C14', label: 'C14', risk: 0.1, isQuery: false, highlight: false });
    nodes.push({ id: 'C132', label: 'C132', risk: 0.8, isQuery: false, highlight: true }); // Big red/orange
    nodes.push({ id: 'C294', label: 'C294', risk: 0.8, isQuery: false, highlight: true });
    nodes.push({ id: 'S101', label: 'S101', risk: 0.8, isQuery: false, highlight: true });
    nodes.push({ id: 'S76', label: 'S76', risk: 0.8, isQuery: false, highlight: true });

    // Generate background nodes
    for (let i = 0; i < 90; i++) {
        const type = Math.random() > 0.7 ? 'S' : 'C';
        nodes.push({
            id: type + Math.floor(Math.random() * 500),
            label: type + Math.floor(Math.random() * 500),
            risk: 0.1,
            isQuery: false,
            highlight: false
        });
    }

    // Core edges (Highlighted)
    edges.push({ source: 'C330', target: 'C132', highlighted: true, label: 'SUPPLIES' });
    edges.push({ source: 'C132', target: 'C294', highlighted: true, label: 'SUPPLIES' });
    edges.push({ source: 'C294', target: 'S101', highlighted: true, label: 'OWNS_SHARE' });
    edges.push({ source: 'C294', target: 'S76', highlighted: true, label: 'OWNS_SHARE' });

    // Background edges
    const defaultRels = ['OWNS_SHARE', 'SUPPLIES', 'AUDITED_BY', 'SUBSIDIARY_OF'];
    for (let i = 0; i < 150; i++) {
        const s = pick(nodes), t = pick(nodes);
        if (s.id !== t.id && !edges.find(e => e.source === s.id && e.target === t.id)) {
            edges.push({ source: s.id, target: t.id, highlighted: false, label: pick(defaultRels) });
        }
    }

    // Update Headers
    document.getElementById('fraudEntities').textContent = nodes.length;
    document.getElementById('fraudLinks').textContent = edges.length;
    document.getElementById('fraudRiskScore').textContent = '0.74';

    const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(edges).id(d => d.id).distance(60))
        .force('charge', d3.forceManyBody().strength(-150))
        .force('center', d3.forceCenter(w / 2, h / 2));

    // Links Background
    const link = g.selectAll('.link').data(edges).enter().append('g');

    // Draw arrows for highlighted links
    svg.append('defs').append('marker')
        .attr('id', 'arrow-head')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 30) // distance from node center
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#ef6c00'); // Orange for highlight

    const path = link.append('line')
        .attr('stroke', d => d.highlighted ? '#ef6c00' : (isDark ? 'rgba(200,200,200,0.1)' : 'rgba(0,0,0,0.1)'))
        .attr('stroke-width', d => d.highlighted ? 4 : 1)
        .attr('marker-end', d => d.highlighted ? 'url(#arrow-head)' : '');

    const linkLabels = link.append('text')
        .attr('font-size', '6px')
        .attr('fill', isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')
        .attr('font-family', 'Share Tech Mono, monospace')
        .text(d => d.label)
        .attr('dy', -2);

    // Nodes
    const node = g.selectAll('.node').data(nodes).enter().append('g')
        .call(d3.drag()
            .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append('circle')
        .attr('r', d => {
            if (d.isQuery && d.highlight) return 40; // huge blue node
            if (d.highlight) return 20; // orange nodes
            return 8; // background
        })
        .attr('fill', d => {
            if (d.isQuery) return '#3b82f6';
            if (d.highlight) return '#ef6c00'; // high risk highlight
            return isDark ? 'rgba(255,255,255,0.8)' : 'rgba(200,200,200,0.8)'; // faint grey
        })
        .attr('stroke', d => isDark ? '#111' : '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', d => (d.highlight || d.isQuery) ? 1 : (isDark ? 0.3 : 0.4));

    node.append('text')
        .attr('font-size', d => d.highlight ? '10px' : '8px')
        .attr('fill', d => {
            if (d.highlight || d.isQuery) return '#fff';
            return isDark ? '#aaa' : '#333';
        })
        .attr('font-family', 'Share Tech Mono, monospace')
        .attr('text-anchor', 'middle')
        .attr('dy', d => d.highlight ? 4 : 14)
        .text(d => d.label);

    sim.on('tick', () => {
        path.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

        linkLabels
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    renderFraudPatterns();
}

function analyzeFraudEntity() {
    window._fraudInit = false;
    initFraudGraph();
    window._fraudInit = true;
}

function highlightPattern(pattern, el) {
    document.querySelectorAll('.fraud-pattern-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    // For demo: just jiggle the network or re-render
    initFraudGraph();
}

function renderFraudPatterns() {
    document.getElementById('fraudShellChains').innerHTML = '<div class="fraud-empty">No shell chains detected</div>';
    document.getElementById('fraudCircularTrade').innerHTML = '<div class="fraud-empty">No circular trade detected</div>';

    const patterns = [
        { name: 'Pattern 1', shareholder: 'S76', supplier: 'C294', ownership: '50.0%', concentration: '100.0%', opp: 0.66 },
        { name: 'Pattern 2', shareholder: 'S101', supplier: 'C294', ownership: '39.0%', concentration: '100.0%', opp: 0.59 }
    ];

    document.getElementById('fraudHiddenInfluence').innerHTML = patterns.map(p => `
        <div class="fraud-pattern-card">
            <div class="pattern-name">
                <strong>${p.name}</strong>
                <span class="opp-badge ${p.opp >= 0.65 ? 'high' : 'medium'}">Opp ${p.opp.toFixed(2)}</span>
            </div>
            <div style="font-size:11px; color:var(--text-dim); line-height:1.5;">
                Shareholder: ${p.shareholder}<br>
                Supplier: ${p.supplier}<br>
                Ownership: ${p.ownership}<br>
                Concentration: ${p.concentration}
            </div>
        </div>
    `).join('');
}

// ==================== CHATBOT ====================
let _chatOpen = false;
let _chatFullscreen = false;

function toggleChatbot() {
    _chatOpen = !_chatOpen;
    const cw = document.getElementById('chatbot-window');
    const orb = document.getElementById('chatbot-orb');
    if (_chatOpen) {
        cw.classList.add('opened');
        orb.style.transform = 'scale(0)';
    } else {
        cw.classList.remove('opened');
        orb.style.transform = 'scale(1)';
    }
}

function toggleChatFullscreen() {
    _chatFullscreen = !_chatFullscreen;
    const cw = document.getElementById('chatbot-window');
    const icon = document.getElementById('chat-fs-icon');
    if (_chatFullscreen) {
        cw.classList.add('fullscreen');
        icon.className = 'ri-fullscreen-exit-line';
    } else {
        cw.classList.remove('fullscreen');
        icon.className = 'ri-fullscreen-line';
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    appendMsg('user', text);
    input.value = '';

    const selectedEntity = window._selectedEntity || PROFILE_DIRECTORY[0]?.id || 'C135';
    const selectedSafe = escapeHtml(selectedEntity);
    const selectedType = getEntityType(selectedEntity);
    const selectedTypeSafe = escapeHtml(selectedType);

    const monitoredList = PROFILE_DIRECTORY.map(e => `${escapeHtml(e.id)} (${escapeHtml(e.type)})`).join(', ');

    const demoMsgs = [
        "You asked: <strong>Why was this account flagged?</strong>",
        `Investigating entity: <strong>${selectedSafe}</strong> <span style="opacity:0.8">(${selectedTypeSafe})</span> (from Profile Scanner).`,
        `Profile Scanner monitored entities: <span style="opacity:0.9">${monitoredList}</span>`
    ];

    if (!hasCSVData()) {
        demoMsgs.push('No CSV data is loaded yet — import a CSV to populate the dashboard and enable entity-level evidence.');
        demoMsgs.push('General reason summary: flags typically trigger on high-risk chains (multi-hop transfers, cross-border hops, and layering-like patterns).');
    } else {
        const relTxs = globalCSVData
            .filter(d => d && (d.source === selectedEntity || d.target === selectedEntity))
            .map(d => ({
                source: escapeHtml(d.source),
                target: escapeHtml(d.target),
                type: escapeHtml(d.type || 'transaction'),
                location: escapeHtml(d.location || 'Unknown'),
                date: escapeHtml(d.date || ''),
                amount: Number.parseFloat(d.amount) || 0,
                risk: Number.parseFloat(d.risk) || 0,
            }));

        const maxRisk = relTxs.reduce((m, t) => Math.max(m, t.risk), 0);
        const highCount = relTxs.filter(t => t.risk >= 0.9).length;

        demoMsgs.push(`Evidence found: <strong>${relTxs.length}</strong> related transactions · high-risk (≥ 0.90): <strong>${highCount}</strong> · max risk: <strong>${maxRisk.toFixed(2)}</strong>.`);

        if (relTxs.length === 0) {
            demoMsgs.push('No direct transactions found for this entity in the imported CSV. Try selecting a different entity from Profile Scanner.');
        } else {
            const top = [...relTxs].sort((a, b) => b.risk - a.risk).slice(0, 4);
            demoMsgs.push(
                'Top related transactions (highest risk first):<br>' +
                top.map(t => {
                    const amt = '₹' + Math.round(t.amount).toLocaleString('en-IN');
                    const dt = t.date ? ` ${t.date}` : '';
                    return `•${dt} ${t.location}: <strong>${t.source}→${t.target}</strong> (${t.type}) ${amt} · risk <strong>${t.risk.toFixed(2)}</strong>`;
                }).join('<br>')
            );
            demoMsgs.push('Next steps: verify source-of-funds, check beneficiary concentration, and review cross-border hops + rapid multi-hop sequences around the highest-risk edges.');
        }
    }

    const initialDelayMs = 650;
    const perMsgDelayMs = 850;
    let t = initialDelayMs;
    demoMsgs.forEach((msg) => {
        setTimeout(() => appendMsg('bot', msg), t);
        t += perMsgDelayMs;
    });
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function appendMsg(sender, text) {
    const body = document.getElementById('chatBody');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender}`;
    msgDiv.innerHTML = `<div class="msg-bubble">${text}</div>`;
    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight;
}
window.toggleChatbot = toggleChatbot;
window.toggleChatFullscreen = toggleChatFullscreen;
window.sendChatMessage = sendChatMessage;
window.handleChatKey = handleChatKey;

// ==================== DASHBOARD STATS ====================
function renderStats() {
    const stats = [
        { icon: 'ri-money-dollar-circle-line', label: 'Total Flows', value: '₹4.2Cr', change: '+12.4%', dir: 'up' },
        { icon: 'ri-alarm-warning-line', label: 'Anomalies', value: '18', change: '+3 new', dir: 'up' },
        { icon: 'ri-focus-3-line', label: 'Network Risk', value: '42.1%', change: '-2.1%', dir: 'down' },
        { icon: 'ri-error-warning-line', label: 'Critical Alerts', value: '5', change: '+2 today', dir: 'up' }
    ];
    document.getElementById('statsGrid').innerHTML = stats.map(s =>
        `<div class="stat-card">
            <i class="${s.icon} icon"></i>
            <div class="label">${s.label}</div>
            <div class="value">${s.value}</div>
            <div class="change ${s.dir}">${s.dir === 'up' ? '▲' : '▼'} ${s.change}</div>
        </div>`
    ).join('');
}

// ==================== MINI GRAPHS (Dashboard) ====================
function renderMiniGraphs() {
    const mg = document.getElementById('mini-graph');
    if (mg) {
        mg.innerHTML = '';
        const w = mg.clientWidth || 300, h = mg.clientHeight || 260;
        const svg = d3.select(mg).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
        const isDark = getTheme() === 'dark';

        for (let i = 0; i < 20; i++) {
            const x1 = Math.random() * w, y1 = Math.random() * h;
            const x2 = Math.random() * w, y2 = Math.random() * h;
            svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)').attr('stroke-width', 2);
            svg.append('circle').attr('cx', x1).attr('cy', y1).attr('r', Math.random() > 0.8 ? 5 : 3)
                .attr('fill', Math.random() > 0.8 ? '#ff3d3d' : (isDark ? '#00e676' : '#00a854')).attr('opacity', 0.8);
        }
    }
}

// ==================== GENERAL INIT ====================
function resetDashboardLayout() {
    document.querySelectorAll('.drag-panel').forEach(p => p.style.display = 'block');
}

document.addEventListener('DOMContentLoaded', () => {
    // Inject close options to customizing dashboard panels
    document.querySelectorAll('.drag-panel .panel-header').forEach(hdr => {
        const closeBtn = document.createElement('i');
        closeBtn.className = 'ri-close-line';
        closeBtn.style.cssText = 'margin-left:auto; cursor:pointer; font-size:16px; opacity:0.6; transition:0.2s;';
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.6';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            hdr.closest('.drag-panel').style.display = 'none';
        };
        hdr.appendChild(closeBtn);
    });

    // Start with an empty dashboard until the user imports a CSV.
    renderEmptyState();
});

// ==================== FUND FLOWS KNOWLEDGE GRAPH ====================
function initForceGraph() {
    const mg = document.getElementById('graph-container'); if (!mg) return;
    mg.innerHTML = '';
    const w = mg.clientWidth || 800, h = mg.clientHeight || 550;
    const isDark = getTheme() === 'dark';
    const svg = d3.select(mg).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.3, 5]).on('zoom', e => g.attr('transform', e.transform)));

    const nodes = Array.from({ length: 60 }, (_, i) => ({ id: i, group: R(1, 4), risk: RF(0, 1) }));
    const edges = Array.from({ length: 80 }, () => ({ source: R(0, 59), target: R(0, 59), value: RF(0.2, 1) })).filter(e => e.source !== e.target);

    const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(edges).id(d => d.id).distance(50))
        .force('charge', d3.forceManyBody().strength(-80))
        .force('center', d3.forceCenter(w / 2, h / 2));

    const link = g.append('g').selectAll('line').data(edges).enter().append('line')
        .attr('stroke', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
        .attr('stroke-width', d => d.value * 3);

    const node = g.append('g').selectAll('circle').data(nodes).enter().append('circle')
        .attr('r', d => 4 + d.risk * 6)
        .attr('fill', d => d.risk > 0.7 ? '#ff3d3d' : (d.group === 1 ? '#3b82f6' : (isDark ? '#00e676' : '#00a854')))
        .attr('opacity', 0.8)
        .call(d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    sim.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
    });
}

// ==================== REAL-TIME METRICS (LINE CHART) ====================
let chartOffset = 0;
function drawLineChart(cid) {
    const el = document.getElementById(cid); if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    if (w === 0 || h === 0) return; // Do not render if element is hidden

    const isDark = getTheme() === 'dark';

    if (!el._svg || el._savedW !== w) {
        el.innerHTML = '';
        el._savedW = w;
        el._svg = d3.select(el).append('svg')
            .attr('viewBox', `0 0 ${w} ${h}`)
            .attr('preserveAspectRatio', 'none')
            .style('width', '100%')
            .style('height', '100%')
            .style('display', 'block');

        const defs = el._svg.append('defs');
        const cg = (id, c1, c2) => {
            const g = defs.append('linearGradient').attr('id', id).attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
            g.append('stop').attr('offset', '0%').style('stop-color', c1).style('stop-opacity', 0.8);
            g.append('stop').attr('offset', '100%').style('stop-color', c2).style('stop-opacity', 0.2);
        };
        cg('gBlue', '#3b82f6', '#3b82f6');
        cg('gCyan', '#00e676', '#00e676');
        cg('gPurp', '#a855f7', '#a855f7');

        el._g1 = el._svg.append('path').attr('fill', 'url(#gBlue)').attr('stroke', 'none');
        el._g2 = el._svg.append('path').attr('fill', 'url(#gCyan)').attr('stroke', 'none');
        el._g3 = el._svg.append('path').attr('fill', 'url(#gPurp)').attr('stroke', 'none');

        el._l1 = el._svg.append('path').attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', 2);
        el._l2 = el._svg.append('path').attr('fill', 'none').attr('stroke', '#00e676').attr('stroke-width', 2);
        el._l3 = el._svg.append('path').attr('fill', 'none').attr('stroke', '#a855f7').attr('stroke-width', 2);

        el._xA = el._svg.append('g').attr('transform', `translate(0,${h - 10})`).attr('color', isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)');
    }

    // Adjusted y logic to be smooth as requested
    const data1 = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 35 + Math.sin((i - chartOffset) * 0.2) * 20 }));
    const data2 = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 25 + Math.cos((i - chartOffset) * 0.25) * 15 }));
    const data3 = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 20 + Math.sin((i - chartOffset * 1.1) * 0.3) * 12 }));

    const xS = d3.scaleLinear().domain([0, 39]).range([10, w - 10]);
    const yS = d3.scaleLinear().domain([0, 70]).range([h - 10, 20]);

    const area = d3.area().x(d => xS(d.x)).y0(h).y1(d => yS(d.y)).curve(d3.curveBasis);
    const line = d3.line().x(d => xS(d.x)).y(d => yS(d.y)).curve(d3.curveBasis);

    el._g1.datum(data1).attr('d', area); el._l1.datum(data1).attr('d', line);
    el._g2.datum(data2).attr('d', area); el._l2.datum(data2).attr('d', line);
    el._g3.datum(data3).attr('d', area); el._l3.datum(data3).attr('d', line);
}
function initLineChart() {
    if (!window._lineInt) {
        window._lineInt = setInterval(() => { chartOffset += 0.5; drawLineChart('linechart-container'); drawLineChart('dash-velocity'); drawLineChart('risk-trend-chart'); }, 50);
    }
}

// ==================== HEATMAP ====================
function initFullHeatmap() {
    const el = document.getElementById('heatmap-container'); if (!el) return;
    el.innerHTML = '';
    const w = el.clientWidth || 800, h = el.clientHeight || 600;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
    const isDark = getTheme() === 'dark';

    const rows = 8, cols = 10;
    const pad = 4, cw = (w - 60) / cols, ch = (h - 40) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const risk = Math.random();
            svg.append('rect')
                .attr('x', 50 + c * cw).attr('y', 20 + r * ch)
                .attr('width', cw - pad).attr('height', ch - pad)
                .attr('rx', 4)
                .attr('fill', risk > 0.8 ? '#ff3d3d' : (risk > 0.4 ? '#ff9800' : '#00e676'))
                .attr('opacity', 0.2 + risk * 0.6);
        }
    }
}

// ==================== SANKEY (MOCK) ====================
function drawSankey(cid) {
    const el = document.getElementById(cid); if (!el) return;
    const w = el.clientWidth || 600, h = el.clientHeight || 300;
    if (w === 0 || h === 0) return;
    el.innerHTML = '';

    const isDark = getTheme() === 'dark';
    const svg = d3.select(el).append('svg')
        .attr('viewBox', `0 0 ${w} ${h}`)
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'block');

    const nodes = [
        { id: 0, x: 20, y: 20, h: 80 }, { id: 1, x: 20, y: 120, h: 100 }, { id: 2, x: 20, y: 240, h: 40 },
        { id: 3, x: w / 2 - 20, y: 40, h: 120 }, { id: 4, x: w / 2 - 20, y: 180, h: 90 },
        { id: 5, x: w - 40, y: 20, h: 60 }, { id: 6, x: w - 40, y: 100, h: 100 }, { id: 7, x: w - 40, y: 220, h: 50 }
    ];

    svg.selectAll('rect').data(nodes).enter().append('rect')
        .attr('x', d => d.x).attr('y', d => d.y).attr('width', 20).attr('height', d => d.h)
        .attr('fill', (d, i) => ['#3b82f6', '#00e676', '#ff9800', '#8b5cf6', '#ec4899', '#10b981', '#f43f5e', '#14b8a6'][i])
        .attr('rx', 4);

    const links = [
        { s: 0, t: 3, sy: 40, ty: 70, w: 30 }, { s: 1, t: 3, sy: 150, ty: 110, w: 40 },
        { s: 1, t: 4, sy: 180, ty: 200, w: 30 }, { s: 2, t: 4, sy: 250, ty: 240, w: 20 },
        { s: 3, t: 5, sy: 60, ty: 40, w: 40 }, { s: 3, t: 6, sy: 120, ty: 120, w: 50 },
        { s: 4, t: 6, sy: 200, ty: 160, w: 30 }, { s: 4, t: 7, sy: 240, ty: 240, w: 30 }
    ];

    links.forEach(l => {
        const s = nodes[l.s], t = nodes[l.t];
        const path = `M${s.x + 20},${l.sy} C${(s.x + t.x) / 2},${l.sy} ${(s.x + t.x) / 2},${l.ty} ${t.x},${l.ty}`;
        const pNode = svg.append('path').attr('d', path).attr('fill', 'none')
            .attr('stroke', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
            .attr('stroke-width', l.w).node();

        function spawnParticle() {
            if (!document.getElementById(cid)) return;
            const particle = svg.append('circle').attr('r', 2.5).attr('fill', '#00e676').attr('opacity', 0.8);
            const len = pNode.getTotalLength();
            particle.transition().duration(R(1500, 3000)).ease(d3.easeLinear)
                .attrTween('transform', function () {
                    return function (t) {
                        const pt = pNode.getPointAtLength(t * len);
                        return `translate(${pt.x},${pt.y})`;
                    };
                })
                .on('end', () => { particle.remove(); setTimeout(spawnParticle, R(500, 2000)); });
        }
        setTimeout(spawnParticle, R(0, 2000));
    });
}
function initSankey() { drawSankey('sankey-container'); drawSankey('dash-sankey'); }

// ==================== BUBBLE CHART ====================
function initBubbleChart() {
    const el = document.getElementById('bubble-chart'); if (!el) return;
    const w = el.clientWidth || 600, h = el.clientHeight || 300;
    if (w === 0 || h === 0) return;
    el.innerHTML = '';
    const svg = d3.select(el).append('svg')
        .attr('viewBox', `0 0 ${w} ${h}`)
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'block');

    const isDark = getTheme() === 'dark';

    // Draw axes
    svg.append('line').attr('x1', 30).attr('y1', h - 30).attr('x2', w - 10).attr('y2', h - 30)
        .attr('stroke', isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)');
    svg.append('line').attr('x1', 30).attr('y1', 10).attr('x2', 30).attr('y2', h - 30)
        .attr('stroke', isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)');

    svg.append('text').attr('x', w / 2).attr('y', h - 5).attr('fill', isDark ? '#aaa' : '#555').attr('font-size', '11px')
        .attr('font-family', 'var(--font-mono)').attr('text-anchor', 'middle').text('Transaction Volume (Relative Log Scale)');
    svg.append('text').attr('x', -h / 2).attr('y', 10).attr('fill', isDark ? '#aaa' : '#555').attr('font-size', '11px')
        .attr('font-family', 'var(--font-mono)').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)')
        .text('Risk Density');

    for (let i = 0; i < 45; i++) {
        const radius = R(10, 45);
        const node = svg.append('circle')
            .attr('cx', R(50, w - 30)).attr('cy', R(30, h - 50))
            .attr('r', radius)
            .attr('fill', pick(['#3b82f6', '#00e676', '#ff9800', '#ff3d3d', '#8b5cf6', '#06b6d4']))
            .attr('opacity', 0.6)
            .attr('stroke', isDark ? '#111' : '#fff').attr('stroke-width', 1);

        // Simple pulsing animation
        if (Math.random() > 0.6) {
            function pulse() {
                node.transition().duration(R(1000, 2000))
                    .attr('r', radius + R(2, 8))
                    .transition().duration(R(1000, 2000))
                    .attr('r', radius)
                    .on('end', pulse);
            }
            pulse();
        }
    }
}

// ==================== OTHER PANELS ====================
function renderAnomalyCharts() {
    const isDark = getTheme() === 'dark';

    // Anomaly Stats Grid
    const statsGrid = document.getElementById('anomalyStatsGrid');
    if (statsGrid) {
        const stats = [
            { label: 'Total Anomalies', value: '1,284', change: '+14%', dir: 'up', icon: 'ri-bug-line', color: 'var(--accent)' },
            { label: 'Critical Severity', value: '42', change: '+3', dir: 'up', icon: 'ri-error-warning-line', color: 'var(--red)' },
            { label: 'Layering Detected', value: '156', change: '-5%', dir: 'down', icon: 'ri-stack-line', color: 'var(--orange)' },
            { label: 'False Positives', value: '8.4%', change: '-1.2%', dir: 'down', icon: 'ri-checkbox-circle-line', color: 'var(--green)' }
        ];

        statsGrid.innerHTML = stats.map(s => `
            <div class="stat-card" style="border-left: 3px solid ${s.color}">
                <i class="${s.icon} icon" style="color: ${s.color}; font-size:24px; margin-bottom:12px; display:block;"></i>
                <div class="label" style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">${s.label}</div>
                <div class="value" style="font-size:24px; font-weight:700; color:var(--white); font-family:var(--font-display);">${s.value}</div>
                <div class="change ${s.dir}">${s.dir === 'up' ? '▲' : '▼'} ${s.change}</div>
            </div>
        `).join('');
    }

    // Premium Bar Chart
    const b1 = document.getElementById('anomaly-bar-chart');
    if (b1) {
        b1.innerHTML = '';
        const w = b1.clientWidth || 400, h = b1.clientHeight || 280;
        if (w > 0 && h > 0) {
            const svg = d3.select(b1).append('svg')
                .attr('viewBox', `0 0 ${w} ${h}`)
                .style('width', '100%').style('height', '100%').style('display', 'block');

            const data = Array.from({ length: 12 }, () => R(15, 95));
            const barW = (w - 20) / 12;

            const defs = svg.append('defs');
            const g = defs.append('linearGradient').attr('id', 'barGradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
            g.append('stop').attr('offset', '0%').style('stop-color', '#ef6c00');
            g.append('stop').attr('offset', '100%').style('stop-color', '#ef6c00').style('stop-opacity', 0.3);

            svg.selectAll('rect').data(data).enter().append('rect')
                .attr('x', (d, i) => 10 + i * barW + 4)
                .attr('y', d => h - (d / 100) * h - 10)
                .attr('width', Math.max(barW - 8, 2))
                .attr('height', d => (d / 100) * h)
                .attr('fill', 'url(#barGradient)')
                .attr('rx', 4);

            // Axis line
            svg.append('line').attr('x1', 10).attr('y1', h - 10).attr('x2', w - 10).attr('y2', h - 10)
                .attr('stroke', isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)').attr('stroke-width', 2);
        }
    }

    // Premium Timeline Scatter Plot
    const b2 = document.getElementById('anomaly-timeline');
    if (b2) {
        b2.innerHTML = '';
        const w = b2.clientWidth || 400, h = b2.clientHeight || 280;
        if (w > 0 && h > 0) {
            const svg = d3.select(b2).append('svg')
                .attr('viewBox', `0 0 ${w} ${h}`)
                .style('width', '100%').style('height', '100%').style('display', 'block');

            const axisY = h / 2 + 10;
            svg.append('line').attr('x1', 20).attr('y1', axisY).attr('x2', w - 20).attr('y2', axisY)
                .attr('stroke', isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)').attr('stroke-width', 2);

            const data = Array.from({ length: 18 }, () => ({ x: R(30, w - 30), y: axisY + R(-50, 50), severity: R(1, 3) }));

            // vertical dashed connecting lines
            svg.selectAll('.connect').data(data).enter().append('line')
                .attr('x1', d => d.x).attr('y1', axisY).attr('x2', d => d.x).attr('y2', d => d.y)
                .attr('stroke', d => d.severity === 3 ? '#ff3d3d' : (d.severity === 2 ? '#eab308' : '#3b82f6'))
                .attr('stroke-dasharray', '3,3').attr('opacity', 0.6);

            // dots
            svg.selectAll('circle').data(data).enter().append('circle')
                .attr('cx', d => d.x).attr('cy', d => d.y)
                .attr('r', d => d.severity * 3 + 2)
                .attr('fill', d => d.severity === 3 ? '#ff3d3d' : (d.severity === 2 ? '#eab308' : '#3b82f6'))
                .attr('opacity', 0.9)
                .attr('stroke', isDark ? '#111' : '#fff').attr('stroke-width', 1.5)
                .style('filter', 'drop-shadow(0px 0px 4px rgba(255,255,255,0.2))');

            // Text annotations for high severity
            svg.selectAll('.annot').data(data.filter(d => d.severity === 3)).enter().append('text')
                .attr('x', d => d.x + 8).attr('y', d => d.y - 8)
                .attr('fill', '#ff3d3d').attr('font-size', '9px').attr('font-family', 'var(--font-mono)')
                .text('Alert');
        }
    }

    // Anomaly Types Analysis Pie Chart
    const b3 = document.getElementById('anomaly-types-pie');
    if (b3) {
        b3.innerHTML = '';
        const w = b3.clientWidth || 400, h = b3.clientHeight || 280;
        if (w > 0 && h > 0) {
            const radius = Math.min(w, h) / 2 - 20;
            const svg = d3.select(b3).append('svg')
                .attr('viewBox', `0 0 ${w} ${h}`).style('width', '100%').style('height', '100%').style('display', 'block')
                .append('g').attr('transform', `translate(${w / 3},${h / 2})`);

            const pieData = [
                { label: 'Velocity Spikes', value: 450, color: '#3b82f6' },
                { label: 'Structural Anomalies', value: 320, color: '#a855f7' },
                { label: 'Layering Detected', value: 156, color: '#eab308' },
                { label: 'Geo-mismatch', value: 89, color: '#ef4444' },
                { label: 'Dormant Account Wake-up', value: 269, color: '#00e676' }
            ];

            const pie = d3.pie().value(d => d.value).padAngle(0.03);
            const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius); // Donut style

            svg.selectAll('path').data(pie(pieData)).enter().append('path')
                .attr('d', arc)
                .attr('fill', d => d.data.color)
                .attr('stroke', isDark ? '#111' : '#fff')
                .style('stroke-width', '2px');

            // Labels around donut (Legend)
            const legend = d3.select(b3).select('svg').append('g')
                .attr('transform', `translate(${w / 3 + radius + 30}, ${h / 2 - (pieData.length * 24) / 2})`);

            legend.selectAll('rect').data(pieData).enter().append('rect')
                .attr('x', 0).attr('y', (d, i) => i * 24)
                .attr('width', 10).attr('height', 10).attr('rx', 2)
                .attr('fill', d => d.color);

            legend.selectAll('text').data(pieData).enter().append('text')
                .attr('x', 18).attr('y', (d, i) => i * 24 + 9)
                .text(d => `${d.label} (${d.value})`)
                .attr('font-size', '11px').attr('fill', isDark ? '#e0e0e0' : '#333')
                .attr('font-family', 'var(--font-mono)');
        }
    }

    // Anomaly Types Analysis Descriptions
    const desc = document.getElementById('anomaly-types-desc');
    if (desc) {
        const descriptions = [
            { title: 'Velocity Spikes', level: 'High', color: '#3b82f6', text: 'Sudden, massive increase in transaction frequency across linked accounts. Often indicates rapid fund dispersion or automated bot activity.' },
            { title: 'Structural Anomalies', level: 'Medium', color: '#a855f7', text: 'Network structures that deviate heavily from standard business logic, such as perfect loops, multi-tiered star patterns, or isolated deep components.' },
            { title: 'Layering Detected', level: 'Critical', color: '#eab308', text: 'Deep chain transactions intended to obfuscate origin funds. Advanced path-tracing reveals high confidence of money laundering behaviors.' },
            { title: 'Geo-mismatch', level: 'Warning', color: '#ef4444', text: 'Login or transaction IP regions conflict entirely with the registered entity locations over impossibly short timeframes.' },
            { title: 'Dormant Account Wake-up', level: 'Warning', color: '#00e676', text: 'Accounts inactive for 6+ months suddenly initiating large aggregate volume transactions. Common in hijacked shell entities.' }
        ];

        desc.innerHTML = '<div style="display:flex; flex-direction:column; gap:12px;">' + descriptions.map(d => `
            <div style="padding:14px; background:var(--surface); border:1px solid var(--border); border-left:4px solid ${d.color}; border-radius:6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong style="color:var(--white); font-family:var(--font-mono); font-size:12px; text-transform:uppercase;">${d.title}</strong>
                    <span style="font-size:10px; color:${d.color}; border:1px solid ${d.color}; padding:2px 8px; border-radius:4px; font-weight:bold;">${d.level}</span>
                </div>
                <div style="font-size:12px; color:var(--text-dim); line-height:1.5; font-family:var(--font-primary);">${d.text}</div>
            </div>
        `).join('') + '</div>';
    }
}

function renderRiskSection() {
    const g = document.getElementById('riskOverviewGrid');
    if (g) g.innerHTML = ['Money Laundering', 'Terrorist Financing', 'Sanctions Risk', 'Credit Fraud'].map(r => `
        <div class="risk-card">
            <i class="ri-shield-star-line rc-icon" style="color:var(--accent)"></i>
            <div class="rc-label">${r}</div>
            <div class="rc-value">${(Math.random() * 100).toFixed(1)}</div>
            <div class="rc-bar"><div class="rc-bar-fill" style="width:${R(20, 80)}%; background:var(--accent)"></div></div>
        </div>
    `).join('');

    const isDark = getTheme() === 'dark';

    const drawDonut = (cid) => {
        const el = document.getElementById(cid); if (!el) return;
        el.innerHTML = '';
        const w = el.clientWidth || 300, h = el.clientHeight || 260;
        const radius = Math.min(w, h) / 2.5;

        const svg = d3.select(el).append('svg')
            .attr('viewBox', `0 0 ${w} ${h}`)
            .style('width', '100%')
            .style('height', '100%')
            .style('display', 'block')
            .append('g')
            .attr('transform', `translate(${w / 2 - 40},${h / 2})`);

        const data = [
            { label: 'Critical', value: 80, color: '#ff3d3d' },
            { label: 'Warning', value: 6526, color: '#eab308' },
            { label: 'Info', value: 813, color: '#333333' }
        ];

        const pie = d3.pie().value(d => d.value).sort(null);
        const arc = d3.arc().innerRadius(radius - 20).outerRadius(radius);

        svg.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .attr('stroke', isDark ? '#000' : '#fff')
            .style('stroke-width', '2px');

        const legend = d3.select(el).select('svg').append('g')
            .attr('transform', `translate(${w / 2 + radius}, ${h / 2 - 20})`);

        legend.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', 0)
            .attr('cy', (d, i) => i * 20)
            .attr('r', 5)
            .attr('fill', d => d.color);

        legend.selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .attr('x', 10)
            .attr('y', (d, i) => i * 20 + 4)
            .text(d => d.label)
            .attr('font-size', '10px')
            .attr('fill', isDark ? '#e0e0e0' : '#333')
            .attr('font-family', 'var(--font-mono)');
    };
    drawDonut('risk-category-chart'); drawDonut('dash-donut');

    const drawThreatPie = (cid) => {
        const el = document.getElementById(cid); if (!el) return;
        el.innerHTML = '';
        const w = el.clientWidth || 800, h = el.clientHeight || 260;
        const radius = Math.min(w, h) / 2.2;

        const svg = d3.select(el).append('svg')
            .attr('viewBox', `0 0 ${w} ${h}`)
            .style('width', '100%')
            .style('height', '100%')
            .style('display', 'block')
            .append('g')
            .attr('transform', `translate(${radius + 20},${h / 2})`);

        const data = [
            { label: 'IPv6 Tunneling or Abuse', value: 6506, color: '#3b82f6' },
            { label: 'Persistence Mechanisms', value: 571, color: '#ef4444' },
            { label: 'SMB/Windows File Sharing Abuse', value: 242, color: '#eab308' },
            { label: 'Unusual Binary Locations', value: 58, color: '#22c55e' },
            { label: 'Persistence Mechanisms', value: 16, color: '#a855f7' },
            { label: 'Nginx Command Injection Attempt', value: 4, color: '#f97316' },
            { label: 'Nginx Directory Traversal Attempt', value: 4, color: '#06b6d4' },
            { label: 'Nginx Local File Inclusion (LFI)', value: 4, color: '#ec4899' }
        ];

        const pie = d3.pie().value(d => d.value).sort(null);
        const arc = d3.arc().innerRadius(0).outerRadius(radius);

        svg.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .attr('stroke', isDark ? '#000' : '#fff')
            .style('stroke-width', '1px');

        const legend = d3.select(el).select('svg').append('g')
            .attr('transform', `translate(${radius * 2 + 40}, ${h / 2 - (data.length * 15) / 2})`);

        legend.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', 0)
            .attr('cy', (d, i) => i * 15)
            .attr('r', 4)
            .attr('fill', d => d.color);

        legend.selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .attr('x', 10)
            .attr('y', (d, i) => i * 15 + 3)
            .text(d => `${d.label} (${d.value})`)
            .attr('font-size', '9px')
            .attr('fill', isDark ? '#e0e0e0' : '#333')
            .attr('font-family', 'var(--font-mono)');
    };
    drawThreatPie('dash-radar');
}

function renderAlerts() {
    const feed = document.getElementById('alertFeed');
    const getDetails = (i) => {
        if (i % 3 === 0) return { type: 'critical', label: 'CRITICAL', color: 'var(--red)', icon: 'ri-error-warning-fill', text: `Massive fund layering detected via Layer ${R(3, 8)} intermediaries referencing CUST${R(1000, 9999)}.` };
        if (i % 2 === 0) return { type: 'warning', label: 'WARNING', color: 'var(--orange)', icon: 'ri-alert-fill', text: `Velocity spike (400x baseline) targeting inactive node ${R(100, 999)} in Region D.` };
        return { type: 'info', label: 'INFO', color: 'var(--blue)', icon: 'ri-information-fill', text: `Automated compliance policy triggered review for entity ${R(4000, 5000)}.` };
    };

    if (feed) feed.innerHTML = Array.from({ length: 10 }, (_, i) => {
        const d = getDetails(i);
        return `
        <div class="alert-item ${d.type}" style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--surface); border:1px solid var(--border); border-left:3px solid ${d.color}; border-radius:6px; transition:0.2s; cursor:pointer;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';">
            <i class="${d.icon}" style="color:${d.color}; font-size:16px;"></i>
            <span class="alert-badge" style="font-size:9px; font-family:var(--font-mono); color:${d.color}; border:1px solid ${d.color}; padding:2px 6px; border-radius:4px; letter-spacing:1px; width:60px; text-align:center;">${d.label}</span>
            <span class="alert-text" style="font-size:13px; color:var(--text); flex:1;">${d.text}</span>
            <span class="alert-time" style="font-size:10px; color:var(--text-dim); font-family:var(--font-mono);">${i * 4 + 2}m ago</span>
        </div>
    `}).join('');

    // Copy feed to risk alert list
    const ra = document.getElementById('riskAlertList');
    if (ra) ra.innerHTML = feed.innerHTML;
}

window.filterAlerts = function (type, el) {
    document.querySelectorAll('.anomaly-filter-bar button').forEach(b => b.classList.remove('pulse-active'));
    if (el) el.classList.add('pulse-active');
    document.querySelectorAll('#alertFeed .alert-item').forEach(item => {
        item.style.display = (type === 'all' || item.classList.contains(type)) ? 'flex' : 'none';
    });
};

function renderProfiles() {
    const pa = document.getElementById('profileArea');
    if (pa) pa.innerHTML = ['krish ramani', 'priya sharma', 'arjun mehta', 'rohan desai'].map(n => `
        <div class="profile-card" onclick="openProfileModal('${n}')" style="cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            <div class="profile-avatar"><i class="ri-user-3-line"></i></div>
            <div class="profile-info">
                <h3 style="text-transform:uppercase">${n}</h3>
                <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-dim)">ID: CUST${R(100, 999)} · Branch: HQ</div>
                <div class="risk-gauge"><div class="risk-gauge-fill" style="width:${R(30, 90)}%; background:var(--accent)"></div></div>
                <div><span class="flag-tag">Velocity Spike</span><span class="flag-tag">Hub Node</span></div>
        </div>
    `).join('');
}

// ==================== CSV IMPORT LOGIC ====================

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        globalCSVData = d3.csvParse(text);
        
        // Show success alert natively
        alert(`Successfully imported ${globalCSVData.length} records! Updating FundSentinel dashboard...`);
        
        // Apply data globally
        updateDashboardWithCSV();

        // Now that data exists, render the rest of the visuals
        renderMiniGraphs();
        initLineChart();
        initSankey();
        initBubbleChart();
        initFullHeatmap();
        renderRiskSection();
        renderAnomalyCharts();

        // Mark sections as initialized for theme/nav refresh logic
        window._metricsInit = true;
        window._heatInit = true;
    };
    reader.readAsText(file);
}

function updateDashboardWithCSV() {
    if (!globalCSVData || globalCSVData.length === 0) return;
    
    let totalVol = 0;
    let criticalCount = 0;
    const uniqueNodes = new Set();
    const alerts = [];
    const profiles = [];

    globalCSVData.forEach(d => {
        const amt = parseFloat(d.amount) || 0;
        const risk = parseFloat(d.risk) || 0;
        totalVol += amt;
        if(d.source) uniqueNodes.add(d.source);
        if(d.target) uniqueNodes.add(d.target);
        
        if (risk > 0.7) {
            criticalCount++;
            alerts.push({
                type: risk > 0.9 ? 'critical' : 'warning',
                color: risk > 0.9 ? 'var(--red)' : 'var(--orange)',
                icon: risk > 0.9 ? 'ri-error-warning-fill' : 'ri-alert-fill',
                label: risk > 0.9 ? 'CRITICAL' : 'WARNING',
                text: `${(d.type || 'Transaction').toUpperCase()} detected from ${d.source} to ${d.target} ($${amt.toLocaleString()}) at ${d.location || 'Unknown'}.`
            });
        }
        
        if (d.source && !profiles.includes(d.source)) profiles.push(d.source);
    });

    // 1. Update Dashboard Stats Grid (Overview)
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card"><i class="ri-money-dollar-circle-line icon"></i><div class="label">CSV Total Volume</div><div class="value">$${(totalVol/1000).toFixed(1)}K</div><div class="change up">▲ Live Data</div></div>
            <div class="stat-card"><i class="ri-shield-check-line icon"></i><div class="label">Monitored Entities</div><div class="value">${uniqueNodes.size}</div><div class="change up">▲ Live Data</div></div>
            <div class="stat-card"><i class="ri-focus-3-line icon"></i><div class="label">Transactions</div><div class="value">${globalCSVData.length}</div><div class="change up">▲ Live Data</div></div>
            <div class="stat-card"><i class="ri-error-warning-line icon" style="color:var(--red)"></i><div class="label">Critical High-Risk</div><div class="value" style="color:var(--red)">${criticalCount}</div><div class="change down">▼ Action Required</div></div>
        `;
    }

    // 2. Update Live Alerts
    const feed = document.getElementById('alertFeed');
    if (feed && alerts.length > 0) {
        feed.innerHTML = alerts.slice(0, 15).map((d, i) => `
            <div class="alert-item ${d.type}" style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--surface); border:1px solid var(--border); border-left:3px solid ${d.color}; border-radius:6px; cursor:pointer;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';">
                <i class="${d.icon}" style="color:${d.color}; font-size:16px;"></i>
                <span class="alert-badge" style="font-size:9px; font-family:var(--font-mono); color:${d.color}; border:1px solid ${d.color}; padding:2px 6px; border-radius:4px; letter-spacing:1px; width:60px; text-align:center;">${d.label}</span>
                <span class="alert-text" style="font-size:13px; color:var(--text); flex:1;">${d.text}</span>
                <span class="alert-time" style="font-size:10px; color:var(--text-dim); font-family:var(--font-mono);">Just now</span>
            </div>
        `).join('');
        
        const ra = document.getElementById('riskAlertList');
        if(ra) ra.innerHTML = feed.innerHTML; 
    }

    // 3. Update Profiles Feed
    const pa = document.getElementById('profileArea');
    if (pa && profiles.length > 0) {
        // Prefer the hard-coded Profile Scanner directory when available; fall back to CSV-derived list.
        const displayIds = (PROFILE_DIRECTORY && PROFILE_DIRECTORY.length)
            ? PROFILE_DIRECTORY.map(e => e.id)
            : Array.from(new Set(profiles)).slice(0, 12);

        pa.innerHTML = displayIds.slice(0, 12).map(n => `
            <div class="profile-card" onclick="openProfileModal('${n}')" style="cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div class="profile-avatar"><i class="ri-building-line"></i></div>
                <div class="profile-info">
                    <h3 style="text-transform:uppercase">${n}</h3>
                    <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-dim)">Entity Type: ${getEntityType(n)}</div>
                    <div class="risk-gauge"><div class="risk-gauge-fill" style="width:${Math.max(20, Math.random()*100)}%; background:var(--accent)"></div></div>
                    <div><span class="flag-tag">CSV Imported</span><span class="flag-tag">Verified</span></div>
                </div>
            </div>
        `).join('');
    }

    // 4. Update Fraud Network Graph dynamically with nodes/edges from CSV
    const container = document.getElementById('fraud-network-graph');
    if (container) {
        container.innerHTML = '';
        const w = container.clientWidth || 800, h = container.clientHeight || 500;
        const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
        const g = svg.append('g');
        svg.call(d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform)));
        
        svg.append('defs').append('marker')
            .attr('id', 'arrow-head-csv')
            .attr('viewBox', '0 -5 10 10').attr('refX', 18).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#ef6c00');

        const nodes = Array.from(uniqueNodes).map(id => ({id: id, label: id, risk: Math.random()}));
        const links = globalCSVData.map(d => ({
            source: d.source, target: d.target, label: d.type
        })).filter(l => l.source && l.target && l.source !== l.target);

        const riskEl = document.getElementById('fraudRiskScore');
        if(riskEl) riskEl.textContent = (criticalCount / Math.max(1, globalCSVData.length)).toFixed(2);
        const entEl = document.getElementById('fraudEntities');
        if(entEl) entEl.textContent = uniqueNodes.size;
        const linkEl = document.getElementById('fraudLinks');
        if(linkEl) linkEl.textContent = links.length;

        const sim = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(w/2, h/2));

        const linkLine = g.selectAll('.link').data(links).enter().append('line')
            .attr('stroke', 'rgba(255,255,255,0.2)').attr('stroke-width', 2).attr('marker-end', 'url(#arrow-head-csv)');
            
        const nodeGroup = g.selectAll('.node').data(nodes).enter().append('g');
        nodeGroup.append('circle').attr('r', 16)
            .attr('fill', d => d.risk > 0.7 ? '#ef6c00' : '#3b82f6')
            .attr('stroke', '#fff').attr('stroke-width', 2);
        nodeGroup.append('text').text(d => d.label).attr('fill', '#fff').attr('font-size', '12px').attr('font-family', 'var(--font-mono)').attr('y', 28).attr('text-anchor', 'middle');

        sim.on('tick', () => {
            linkLine.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }
}
window.handleCSVUpload = handleCSVUpload;

// ==================== PROFILE MODAL LOGIC ====================
function openProfileModal(entity) {
    window._selectedEntity = entity;
    window._selectedEntityType = getEntityType(entity);
    const modal = document.getElementById('profile-modal');
    if(!modal) return;
    
    document.getElementById('modalId').textContent = entity.toUpperCase();
    modal.classList.add('active');

    // Filter data for this entity safely based on whether CSV data exists or mock otherwise
    const relTxs = globalCSVData ? globalCSVData.filter(d => d.source === entity || d.target === entity) : [
        { source: entity, target: 'EXTERNAL_1', amount: 500000, type: 'transfer', date: '2023-11-01' },
        { source: 'EXTERNAL_2', target: entity, amount: 200000, type: 'payment', date: '2023-11-02' }
    ];
    
    // Draw chain graph
    const cEl = document.getElementById('modal-chain-graph');
    cEl.innerHTML = '';
    if(relTxs.length > 0) {
        const w = cEl.clientWidth || 400, h = cEl.clientHeight || 280;
        const svg = d3.select(cEl).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
        
        let nodes = new Set(), links = [];
        relTxs.forEach(tx => {
            nodes.add(tx.source); nodes.add(tx.target);
            links.push({source: tx.source, target: tx.target});
        });
        
        const nodeArr = Array.from(nodes).map(id => ({id, main: id===entity}));
        
        const sim = d3.forceSimulation(nodeArr)
            .force('link', d3.forceLink(links).id(d=>d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(w/2, h/2));
            
        svg.append('defs').append('marker').attr('id','arrow-modal')
            .attr('viewBox', '0 -5 10 10').attr('refX', 18).attr('refY', 0)
            .attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
            .append('path').attr('d','M0,-5L10,0L0,5').attr('fill','var(--accent)');
            
        const linkLine = svg.selectAll('.m-link').data(links).enter().append('line')
            .attr('stroke', 'var(--border-light)').attr('stroke-width', 2).attr('marker-end','url(#arrow-modal)');
            
        const nGroup = svg.selectAll('.m-node').data(nodeArr).enter().append('g');
        nGroup.append('circle').attr('r', 16).attr('fill', d=>d.main ? 'var(--red)' : '#3b82f6')
            .attr('stroke', '#fff').attr('stroke-width', 2);
        nGroup.append('text').text(d=>d.id).attr('fill','#fff').attr('font-size','10px').attr('font-family','var(--font-mono)').attr('y',26).attr('text-anchor','middle');
        
        sim.on('tick', () => {
            linkLine.attr('x1', d=>d.source.x).attr('y1', d=>d.source.y).attr('x2', d=>d.target.x).attr('y2', d=>d.target.y);
            nGroup.attr('transform', d=>`translate(${d.x},${d.y})`);
        });
    } else {
        cEl.innerHTML = '<div style="padding:20px; color:var(--text-dim); font-family:var(--font-mono);">No network data found.</div>';
    }
    
    // Draw Activity List
    const tEl = document.getElementById('modal-tx-list');
    if(relTxs.length > 0) {
        tEl.innerHTML = relTxs.map(tx => `
            <div style="padding:12px; margin-bottom:10px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:8px; font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:var(--accent); font-family:var(--font-mono); font-weight:bold; letter-spacing:1px;">${tx.type ? tx.type.toUpperCase() : 'TRANSFER'}</span>
                    <span style="color:var(--white); font-weight:bold; font-size:14px;">₹${parseFloat(tx.amount).toLocaleString()}</span>
                </div>
                <div style="color:var(--text-dim); display:flex; justify-content:space-between; font-size:11px;">
                    <span><i class="ri-arrow-right-line"></i> ${tx.source} <span style="color:var(--white)">→</span> ${tx.target}</span>
                    <span style="font-family:var(--font-mono); opacity:0.7;">${tx.date || 'Live Data'}</span>
                </div>
            </div>
        `).join('');
    } else {
        tEl.innerHTML = '<div style="padding:20px; color:var(--text-dim); font-family:var(--font-mono);">No transactions found.</div>';
    }
}

function closeProfileModal(e) {
    if(e && e.target.id !== 'profile-modal' && e.target.className !== 'modal-close') return;
    const m = document.getElementById('profile-modal');
    if(m) m.classList.remove('active');
}
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
