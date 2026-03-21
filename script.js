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
    if (id === 'metrics' && !window._metricsInit) { initLineChart(); initSankey(); window._metricsInit = true; }
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
    nodes.push({ id: 'S76',  label: 'S76',  risk: 0.8, isQuery: false, highlight: true }); 

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
    for(let i = 0; i < 150; i++) {
        const s = pick(nodes), t = pick(nodes);
        if(s.id !== t.id && !edges.find(e => e.source === s.id && e.target === t.id)) {
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
            if(d.isQuery && d.highlight) return 40; // huge blue node
            if(d.highlight) return 20; // orange nodes
            return 8; // background
        })
        .attr('fill', d => {
            if(d.isQuery) return '#3b82f6';
            if(d.highlight) return '#ef6c00'; // high risk highlight
            return isDark ? 'rgba(255,255,255,0.8)' : 'rgba(200,200,200,0.8)'; // faint grey
        })
        .attr('stroke', d => isDark ? '#111' : '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', d => (d.highlight || d.isQuery) ? 1 : (isDark ? 0.3 : 0.4));

    node.append('text')
        .attr('font-size', d => d.highlight ? '10px' : '8px')
        .attr('fill', d => {
            if(d.highlight || d.isQuery) return '#fff';
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
            .attr('x', d => (d.source.x + d.target.x)/2)
            .attr('y', d => (d.source.y + d.target.y)/2);

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

    const nodes = Array.from({length: 60}, (_, i) => ({ id: i, group: R(1, 4), risk: RF(0, 1) }));
    const edges = Array.from({length: 80}, () => ({ source: R(0, 59), target: R(0, 59), value: RF(0.2, 1) })).filter(e => e.source !== e.target);

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
    const w = el.clientWidth || 600, h = el.clientHeight || 260;
    const isDark = getTheme() === 'dark';
    
    if (!el._svg) {
        el.innerHTML = '';
        el._svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
        
        const defs = el._svg.append('defs');
        const cg = (id, c1, c2) => {
            const g = defs.append('linearGradient').attr('id', id).attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
            g.append('stop').attr('offset','0%').style('stop-color',c1).style('stop-opacity',0.6);
            g.append('stop').attr('offset','100%').style('stop-color',c2).style('stop-opacity',0.05);
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

        // Remove axes lines to match the sleek premium feel of the user's layout screenshot
        el._xA = el._svg.append('g').attr('transform', `translate(0,${h-10})`).attr('color', isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)');
    }
    
    // Adjusted y logic so traces overlap distinctly like in the image
    const data1 = Array.from({length: 40}, (_, i) => ({x: i, y: 35 + Math.sin((i-chartOffset)*0.2)*20 + R(0,5)}));
    const data2 = Array.from({length: 40}, (_, i) => ({x: i, y: 25 + Math.cos((i-chartOffset)*0.25)*15 + R(0,4)}));
    const data3 = Array.from({length: 40}, (_, i) => ({x: i, y: 20 + Math.sin((i-chartOffset*1.3)*0.4)*12 + R(0,3)}));

    const xS = d3.scaleLinear().domain([0, 39]).range([10, w-10]);
    const yS = d3.scaleLinear().domain([0, 70]).range([h-10, 20]);

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
    
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            const risk = Math.random();
            svg.append('rect')
                .attr('x', 50 + c*cw).attr('y', 20 + r*ch)
                .attr('width', cw-pad).attr('height', ch-pad)
                .attr('rx', 4)
                .attr('fill', risk > 0.8 ? '#ff3d3d' : (risk > 0.4 ? '#ff9800' : '#00e676'))
                .attr('opacity', 0.2 + risk*0.6);
        }
    }
}

// ==================== SANKEY (MOCK) ====================
function drawSankey(cid) {
    const el = document.getElementById(cid); if (!el) return;
    el.innerHTML = '';
    const w = el.clientWidth || 600, h = el.clientHeight || 300;
    const isDark = getTheme() === 'dark';
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
    
    const nodes = [
        {id:0,x:20,y:20,h:80},{id:1,x:20,y:120,h:100},{id:2,x:20,y:240,h:40},
        {id:3,x:w/2-20,y:40,h:120},{id:4,x:w/2-20,y:180,h:90},
        {id:5,x:w-40,y:20,h:60},{id:6,x:w-40,y:100,h:100},{id:7,x:w-40,y:220,h:50}
    ];
    
    svg.selectAll('rect').data(nodes).enter().append('rect')
        .attr('x', d=>d.x).attr('y', d=>d.y).attr('width', 20).attr('height', d=>d.h)
        .attr('fill', (d,i) => ['#3b82f6','#00e676','#ff9800','#8b5cf6','#ec4899','#10b981','#f43f5e','#14b8a6'][i])
        .attr('rx', 4);
        
    const links = [
        {s:0, t:3, sy:40, ty:70, w:30}, {s:1, t:3, sy:150, ty:110, w:40}, 
        {s:1, t:4, sy:180, ty:200, w:30}, {s:2, t:4, sy:250, ty:240, w:20},
        {s:3, t:5, sy:60, ty:40, w:40}, {s:3, t:6, sy:120, ty:120, w:50},
        {s:4, t:6, sy:200, ty:160, w:30}, {s:4, t:7, sy:240, ty:240, w:30}
    ];
    
    links.forEach(l => {
        const s = nodes[l.s], t = nodes[l.t];
        const path = `M${s.x+20},${l.sy} C${(s.x+t.x)/2},${l.sy} ${(s.x+t.x)/2},${l.ty} ${t.x},${l.ty}`;
        const pNode = svg.append('path').attr('d', path).attr('fill', 'none')
           .attr('stroke', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
           .attr('stroke-width', l.w).node();

        function spawnParticle() {
            if(!document.getElementById(cid)) return;
            const particle = svg.append('circle').attr('r', 2.5).attr('fill', '#00e676').attr('opacity', 0.8);
            const len = pNode.getTotalLength();
            particle.transition().duration(R(1500, 3000)).ease(d3.easeLinear)
                .attrTween('transform', function() {
                    return function(t) {
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
    const el = document.getElementById('bubble-chart'); if(!el) return;
    el.innerHTML = '';
    const w = el.clientWidth || 600, h = el.clientHeight || 300;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
    const isDark = getTheme() === 'dark';
    
    for(let i=0; i<30; i++) {
        svg.append('circle')
            .attr('cx', R(40, w-40)).attr('cy', R(40, h-40))
            .attr('r', R(10, 40))
            .attr('fill', pick(['#3b82f6', '#00e676', '#ff9800', '#ff3d3d', '#8b5cf6']))
            .attr('opacity', 0.5);
    }
}

// ==================== OTHER PANELS ====================
function renderAnomalyCharts() {
    const b1 = document.getElementById('anomaly-bar-chart');
    if(b1) b1.innerHTML = '<div style="display:flex; height:100%; align-items:flex-end; gap:8px; padding:10px;">' + Array.from({length:12}, ()=>`<div style="flex:1; background:#ef6c00; height:${R(20,100)}%; border-radius:4px 4px 0 0; opacity:0.8;"></div>`).join('') + '</div>';
    const b2 = document.getElementById('anomaly-timeline');
    if(b2) b2.innerHTML = '<div style="display:flex; height:100%; align-items:center; border-bottom:1px solid var(--border); margin:0 20px;">' + Array.from({length:8}, ()=>`<div style="width:12px; height:12px; border-radius:50%; background:#ff3d3d; margin:auto; box-shadow:0 0 10px #ff3d3d;"></div>`).join('') + '</div>';
}

function renderRiskSection() {
    const g = document.getElementById('riskOverviewGrid');
    if(g) g.innerHTML = ['Money Laundering', 'Terrorist Financing', 'Sanctions Risk', 'Credit Fraud'].map(r => `
        <div class="risk-card">
            <i class="ri-shield-star-line rc-icon" style="color:var(--accent)"></i>
            <div class="rc-label">${r}</div>
            <div class="rc-value">${(Math.random()*100).toFixed(1)}</div>
            <div class="rc-bar"><div class="rc-bar-fill" style="width:${R(20,80)}%; background:var(--accent)"></div></div>
        </div>
    `).join('');
    
    const isDark = getTheme() === 'dark';
    const drawDonut = (cid, size) => {
        const el = document.getElementById(cid); if(!el) return;
        el.innerHTML = ''; const srcData = [R(30,50), R(20,40), R(10,30), R(5,15)];
        const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${size} ${size}`).style('max-width', size + 'px').style('margin', '0 auto').style('display', 'block').append('g').attr('transform', `translate(${size/2},${size/2})`);
        const p = d3.pie()(srcData); const a = d3.arc().innerRadius(size/3).outerRadius(size/2 - 10);
        svg.selectAll('path').data(p).enter().append('path').attr('d', a).attr('fill', (d,i) => ['#ff3d3d','#ff9800','#3b82f6','#00e676'][i]).attr('stroke', isDark?'#000':'#fff').attr('stroke-width', 2);
        
        const labels = ['High', 'Med', 'Low', 'Info'];
        svg.selectAll('text').data(p).enter().append('text')
            .attr('transform', d => `translate(${a.centroid(d)})`)
            .attr('dy', '0.35em').attr('text-anchor', 'middle')
            .attr('fill', '#fff').attr('font-size', '10px').attr('font-family', 'Share Tech Mono, monospace')
            .text((d,i) => labels[i]);
    };
    drawDonut('risk-category-chart', 200); drawDonut('dash-donut', 150);

    const drawRadar = (cid, size) => {
        const el = document.getElementById(cid); if(!el) return;
        const cx = size/2, cy = size/2, r = size/2 - 20;
        let poly = '', grid = '';
        const pts = [];
        for(let i=0; i<6; i++) {
            const angle = (Math.PI/3)*i - Math.PI/2;
            const len = R(40,100)/100;
            const px = cx + Math.cos(angle)*r*len, py = cy + Math.sin(angle)*r*len;
            poly += `${px},${py} `;
            pts.push({x: px, y: py});
            grid += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle)*r}" y2="${cy + Math.sin(angle)*r}" stroke="${isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}" stroke-width="1"/>`;
        }
        el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" style="max-width:${size}px; margin:0 auto; display:block;">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}" stroke-width="1"/>
            <circle cx="${cx}" cy="${cy}" r="${r*0.66}" fill="none" stroke="${isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}" stroke-width="1"/>
            <circle cx="${cx}" cy="${cy}" r="${r*0.33}" fill="none" stroke="${isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}" stroke-width="1"/>
            ${grid}
            <polygon points="${poly}" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="2"/>
            ${pts.map((p,i) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#3b82f6"/>
                <text x="${cx + Math.cos((Math.PI/3)*i - Math.PI/2)*(r+14)}" y="${cy + Math.sin((Math.PI/3)*i - Math.PI/2)*(r+14)}" fill="${isDark?'#aaa':'#555'}" font-size="9px" font-family="Share Tech Mono, monospace" text-anchor="middle" dominant-baseline="middle">${['Velocity', 'Volume', 'Links', 'Hops', 'Alerts', 'Dormant'][i]}</text>`
            ).join('')}
        </svg>`;
    };
    drawRadar('dash-radar', 160);
}

function renderAlerts() {
    const feed = document.getElementById('alertFeed');
    if(feed) feed.innerHTML = Array.from({length:8}, (_,i) => `
        <div class="alert-item ${i%3===0?'critical':(i%2===0?'warning':'info')}">
            <span class="alert-badge ${i%3===0?'critical':(i%2===0?'warning':'info')}">${i%3===0?'CRITICAL':(i%2===0?'WARNING':'INFO')}</span>
            <span class="alert-text">Suspicious velocity spike detected in Account ${R(1000,9999)}</span>
            <span class="alert-time">${i*5 + 2} min ago</span>
        </div>
    `).join('');
    const ra = document.getElementById('riskAlertList');
    if(ra) ra.innerHTML = feed.innerHTML; 
}

function renderProfiles() {
    const pa = document.getElementById('profileArea');
    if(pa) pa.innerHTML = ['krish ramani', 'priya sharma', 'arjun mehta', 'rohan desai'].map(n => `
        <div class="profile-card">
            <div class="profile-avatar"><i class="ri-user-3-line"></i></div>
            <div class="profile-info">
                <h3 style="text-transform:uppercase">${n}</h3>
                <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-dim)">ID: CUST${R(100,999)} · Branch: HQ</div>
                <div class="risk-gauge"><div class="risk-gauge-fill" style="width:${R(30,90)}%; background:var(--accent)"></div></div>
                <div><span class="flag-tag">Velocity Spike</span><span class="flag-tag">Hub Node</span></div>
            </div>
        </div>
    `).join('');
}
