// ==================== UTILITIES & STATE ====================
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const RF = (a, b) => Math.random() * (b - a) + a;
const pick = a => a[R(0, a.length - 1)];
const fmt = n => n >= 1e7 ? '₹' + (n / 1e7).toFixed(1) + 'Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + 'L' : '₹' + n.toLocaleString('en-IN');
let crazyMode = false, themePulse = false;

// ==================== THEME MANAGEMENT ====================
function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }

function toggleTheme() {
    const html = document.documentElement;
    const curr = getTheme();
    const next = curr === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('neotrack-theme', next);

    // Update icons and labels
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.className = next === 'dark' ? 'ri-moon-line' : 'ri-sun-line';
    if (label) label.textContent = next === 'dark' ? 'Light' : 'Dark';

    // Re-render complex charts for color updates
    if (window._graphInit) { initForceGraph(); }
    if (window._heatInit) { initFullHeatmap(); }
    if (window._fraudInit) { initFraudGraph(); }
    if (window._metricsInit) { initLineChart(); initSankey(); }
    renderMiniGraphs();
}

(function initTheme() {
    const saved = localStorage.getItem('neotrack-theme');
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

    // Lazy Load Initialization
    if (id === 'fundflows' && !window._graphInit) { initForceGraph(); window._graphInit = true; }
    if (id === 'metrics' && !window._metricsInit) { initSankey(); initBubbleChart(); window._metricsInit = true; }
    if (id === 'heatmap' && !window._heatInit) { initFullHeatmap(); window._heatInit = true; }
    if (id === 'fraud' && !window._fraudInit) { initFraudGraph(); window._fraudInit = true; }
}

function toggleCrazy() {
    crazyMode = !crazyMode;
    document.body.classList.toggle('crazy', crazyMode);
    document.getElementById('crazyBtn').classList.toggle('on', crazyMode);
}

function refreshData() {
    renderStats();
    if (window._graphInit) updateForceGraph();
    if (window._fraudInit) initFraudGraph();
    renderAlerts();
    renderProfiles();
    renderMiniGraphs();
}

function exportViz() { alert('Export generation triggered.'); }

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

    renderStats();
    renderMiniGraphs();
    initLineChart();
    initSankey();
    initBubbleChart();
    renderRiskSection();
    renderAnomalyCharts();
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

    // Draw dummy axes
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
        <div class="profile-card">
            <div class="profile-avatar"><i class="ri-user-3-line"></i></div>
            <div class="profile-info">
                <h3 style="text-transform:uppercase">${n}</h3>
                <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-dim)">ID: CUST${R(100, 999)} · Branch: HQ</div>
                <div class="risk-gauge"><div class="risk-gauge-fill" style="width:${R(30, 90)}%; background:var(--accent)"></div></div>
                <div><span class="flag-tag">Velocity Spike</span><span class="flag-tag">Hub Node</span></div>
            </div>
        </div>
    `).join('');
}
