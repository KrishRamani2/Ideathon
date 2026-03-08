// ==================== UTILITIES ====================
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const RF = (a, b) => Math.random() * (b - a) + a;
const pick = a => a[R(0, a.length - 1)];
const fmt = n => n >= 1e7 ? '₹' + (n / 1e7).toFixed(1) + 'Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + 'L' : '₹' + n.toLocaleString('en-IN');
let crazyMode = false, themePulse = false;

// ==================== HEADER CLOCK ====================
function updateClock() {
  const now = new Date();
  const el = document.getElementById('headerClock');
  if (el) {
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `${h}:${m}:${s} IST`;
  }
}
setInterval(updateClock, 1000);
updateClock();

// ==================== THREE.JS GREEN GLOBE BACKGROUND ====================
(function initThreeGlobe() {
  const canvas = document.getElementById('three-bg');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);

  // ---- GLOBE (Wireframe sphere) ----
  const globeGeo = new THREE.SphereGeometry(2.2, 48, 48);
  const globeMat = new THREE.MeshBasicMaterial({
    color: 0x00e676,
    wireframe: true,
    transparent: true,
    opacity: 0.12
  });
  const globe = new THREE.Mesh(globeGeo, globeMat);
  globe.position.set(1.2, -0.3, 0);
  scene.add(globe);

  // ---- Inner globe for depth ----
  const innerGeo = new THREE.SphereGeometry(2.0, 24, 24);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x00c853,
    wireframe: true,
    transparent: true,
    opacity: 0.04
  });
  const innerGlobe = new THREE.Mesh(innerGeo, innerMat);
  innerGlobe.position.set(1.2, -0.3, 0);
  scene.add(innerGlobe);

  // ---- Latitude / longitude ring lines ----
  const ringGeo1 = new THREE.RingGeometry(2.3, 2.32, 80);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.position.set(1.2, -0.3, 0);
  ring1.rotation.x = Math.PI * 0.4;
  scene.add(ring1);

  const ring2 = ring1.clone();
  ring2.rotation.x = Math.PI * 0.7;
  ring2.rotation.z = Math.PI * 0.3;
  scene.add(ring2);

  const ring3 = ring1.clone();
  ring3.rotation.y = Math.PI * 0.5;
  ring3.rotation.z = Math.PI * 0.1;
  scene.add(ring3);

  // ---- Glowing dots on globe surface (faux city lights) ----
  const dotCount = 120;
  const dotGeo = new THREE.BufferGeometry();
  const dotPositions = new Float32Array(dotCount * 3);
  for (let i = 0; i < dotCount; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = 2.2;
    dotPositions[i * 3] = 1.2 + r * Math.sin(phi) * Math.cos(theta);
    dotPositions[i * 3 + 1] = -0.3 + r * Math.sin(phi) * Math.sin(theta);
    dotPositions[i * 3 + 2] = r * Math.cos(phi);
  }
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
  const dotMat = new THREE.PointsMaterial({
    color: 0x00e676,
    size: 0.03,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  scene.add(dots);

  // ---- Ambient particles (space dust) ----
  const pCount = 300;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 14;
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x00e676,
    size: 0.012,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // ---- Connection arc lines (network routes) ----
  function createArc(p1, p2) {
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(3.0);
    mid.x += 1.2; mid.y += -0.3;
    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const points = curve.getPoints(30);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.06 });
    return new THREE.Line(geo, mat);
  }
  for (let i = 0; i < 8; i++) {
    const phi1 = Math.acos(2 * Math.random() - 1);
    const theta1 = 2 * Math.PI * Math.random();
    const phi2 = Math.acos(2 * Math.random() - 1);
    const theta2 = 2 * Math.PI * Math.random();
    const r = 2.2;
    const p1 = new THREE.Vector3(1.2 + r * Math.sin(phi1) * Math.cos(theta1), -0.3 + r * Math.sin(phi1) * Math.sin(theta1), r * Math.cos(phi1));
    const p2 = new THREE.Vector3(1.2 + r * Math.sin(phi2) * Math.cos(theta2), -0.3 + r * Math.sin(phi2) * Math.sin(theta2), r * Math.cos(phi2));
    scene.add(createArc(p1, p2));
  }

  // ---- Animation loop ----
  function animate() {
    requestAnimationFrame(animate);
    const speed = crazyMode ? 0.008 : 0.002;

    // Rotate globe
    globe.rotation.y += speed;
    globe.rotation.x += speed * 0.15;
    innerGlobe.rotation.y += speed * 0.8;
    innerGlobe.rotation.x -= speed * 0.1;

    // Rotate rings
    ring1.rotation.z += speed * 0.3;
    ring2.rotation.z -= speed * 0.2;
    ring3.rotation.y += speed * 0.25;

    // Rotate dots with globe
    dots.rotation.y += speed;
    dots.rotation.x += speed * 0.15;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();

// ==================== SIDEBAR & SECTIONS ====================
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }
function switchSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  if (el) el.classList.add('active');
  if (id === 'fundflows' && !window._graphInit) { initForceGraph(); window._graphInit = true; }
  if (id === 'metrics' && !window._metricsInit) { initLineChart(); initSankey(); window._metricsInit = true; }
  if (id === 'heatmap' && !window._heatInit) { initFullHeatmap(); window._heatInit = true; }
}
function toggleCrazy() { crazyMode = !crazyMode; document.body.classList.toggle('crazy', crazyMode); document.getElementById('crazyBtn').classList.toggle('on', crazyMode); }
function toggleThemePulse() { themePulse = !themePulse; document.getElementById('themePulseBtn').classList.toggle('pulse-active', themePulse); }
function refreshData() { renderStats(); if (window._graphInit) updateForceGraph(); if (window._metricsInit) { updateLineChart(); initSankey(); } renderAlerts(); renderProfiles(); renderMiniGraphs(); }
function exportViz() { alert('Export: In production, use html2canvas CDN for PNG export.'); }

// ==================== DRAG & DROP ====================
(function initDrag() {
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('dashGrid');
    if (!grid) return;
    let dragEl = null;
    grid.addEventListener('dragstart', e => {
      const panel = e.target.closest('.drag-panel');
      if (!panel) return;
      dragEl = panel;
      panel.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    grid.addEventListener('dragend', e => {
      const panel = e.target.closest('.drag-panel');
      if (panel) panel.classList.remove('dragging');
      grid.querySelectorAll('.drag-panel').forEach(p => p.classList.remove('drag-over'));
      dragEl = null;
    });
    grid.addEventListener('dragover', e => {
      e.preventDefault();
      const target = e.target.closest('.drag-panel');
      if (target && target !== dragEl) {
        grid.querySelectorAll('.drag-panel').forEach(p => p.classList.remove('drag-over'));
        target.classList.add('drag-over');
      }
    });
    grid.addEventListener('drop', e => {
      e.preventDefault();
      const target = e.target.closest('.drag-panel');
      if (target && dragEl && target !== dragEl) {
        const children = [...grid.children];
        const fromIdx = children.indexOf(dragEl);
        const toIdx = children.indexOf(target);
        if (fromIdx < toIdx) target.after(dragEl);
        else target.before(dragEl);
      }
      grid.querySelectorAll('.drag-panel').forEach(p => p.classList.remove('drag-over'));
    });
  });
})();

// ==================== MOCK DATA ====================
const BRANCHES = ['Mumbai_Andheri', 'Mumbai_Borivali', 'Mumbai_Dadar', 'Pune_Koregaon', 'Delhi_CP', 'Bangalore_MG', 'Chennai_T_Nagar', 'Kolkata_Park_St', 'Hyderabad_Banjara', 'Ahmedabad_CG'];
const NAMES = ['KRISH', 'ARJUN', 'PRIYA', 'MEERA', 'ROHAN', 'AISHA', 'VIKRAM', 'NISHA', 'AMIT', 'SANYA', 'DEV', 'RIYA', 'KARAN', 'NEHA', 'RAHUL', 'POOJA', 'SURESH', 'ANITA', 'DEEPAK', 'KAVITA'];
const CHANNELS = ['mobile_app', 'net_banking', 'ATM', 'branch', 'UPI', 'NEFT', 'RTGS', 'IMPS'];
function genAcct() { return 'ACCT' + R(100000, 999999); }
function genNodes(n) { const nodes = []; for (let i = 0; i < n; i++) { nodes.push({ id: genAcct(), name: pick(NAMES) + '_' + R(1, 99), type: pick(['savings', 'current', 'loan', 'FD']), branch: pick(BRANCHES), risk: RF(0, 1), value: R(10000, 50000000), channel: pick(CHANNELS), dormant: Math.random() < 0.15 }); } return nodes; }
function genEdges(nodes, m) { const edges = []; for (let i = 0; i < m; i++) { const s = pick(nodes), t = pick(nodes); if (s.id !== t.id) edges.push({ source: s.id, target: t.id, amount: R(5000, 50000000), channel: pick(CHANNELS), suspicious: Math.random() < 0.2, timestamp: new Date(Date.now() - R(0, 86400000 * 30)).toISOString() }); } return edges; }
let graphNodes = genNodes(50), graphEdges = genEdges(graphNodes, 80);

// ==================== STAT CARDS ====================
function renderStats() {
  const stats = [
    { icon: 'ri-money-dollar-circle-line', label: 'Total Flows', value: fmt(graphEdges.reduce((a, e) => a + e.amount, 0)), change: '+12.4%', dir: 'up' },
    { icon: 'ri-alarm-warning-line', label: 'Anomalies', value: graphEdges.filter(e => e.suspicious).length, change: '+3 new', dir: 'up' },
    { icon: 'ri-focus-3-line', label: 'Risk Score', value: (graphNodes.reduce((a, n) => a + n.risk, 0) / graphNodes.length * 100).toFixed(1) + '%', change: '-2.1%', dir: 'down' },
    { icon: 'ri-node-tree', label: 'Active Nodes', value: graphNodes.length, change: '+5', dir: 'up' },
    { icon: 'ri-error-warning-line', label: 'Critical Alerts', value: R(3, 12), change: '+2 today', dir: 'up' },
    { icon: 'ri-archive-line', label: 'Evidence Packs', value: R(15, 45), change: '3 pending', dir: 'up' }
  ];
  document.getElementById('statsGrid').innerHTML = stats.map(s => `<div class="stat-card"><i class="${s.icon} icon"></i><div class="label">${s.label}</div><div class="value">${s.value}</div><div class="change ${s.dir}">${s.dir === 'up' ? '▲' : '▼'} ${s.change}</div></div>`).join('');
}

// ==================== ALERTS ====================
function renderAlerts() {
  const types = [
    { sev: 'critical', icon: 'ri-error-warning-fill', text: '₹5Cr layering detected: 7 hops across Mumbai branches in <1hr', time: '2 min ago' },
    { sev: 'critical', icon: 'ri-error-warning-fill', text: 'Round-trip pattern: ACCT→3 intermediaries→ACCT in 24h, total ₹8.2Cr', time: '15 min ago' },
    { sev: 'warning', icon: 'ri-alert-fill', text: 'Dormant account ACCT847291 activated with ₹45L inflow via UPI', time: '32 min ago' },
    { sev: 'warning', icon: 'ri-alert-fill', text: 'Velocity spike: 12x avg transactions from Dadar branch (ATM channel)', time: '1 hr ago' },
    { sev: 'info', icon: 'ri-information-fill', text: 'Structuring alert: 9x₹9.9L deposits (below ₹10L CTR threshold)', time: '2 hr ago' },
    { sev: 'critical', icon: 'ri-error-warning-fill', text: 'Network hub detected: Single account connected to 23 entities in 48hrs', time: '3 hr ago' },
    { sev: 'warning', icon: 'ri-alert-fill', text: 'Profile mismatch: Declared income ₹12L vs ₹1.2Cr monthly flow volume', time: '4 hr ago' },
    { sev: 'info', icon: 'ri-information-fill', text: 'New cluster formed: 8 previously unlinked accounts now share beneficiary', time: '5 hr ago' },
    { sev: 'critical', icon: 'ri-error-warning-fill', text: 'Hawala pattern match (85%): Rapid cross-branch transfers Andheri↔Borivali', time: '6 hr ago' },
    { sev: 'info', icon: 'ri-information-fill', text: 'Auto-generated FIU STR #2847 for suspicious circular flow pattern', time: '7 hr ago' }
  ];
  document.getElementById('alertFeed').innerHTML = types.map(a => `<div class="alert-item ${a.sev}"><span class="alert-badge ${a.sev}">${a.sev}</span><span class="alert-text">${a.text}</span><span class="alert-time">${a.time}</span></div>`).join('');
}

// ==================== PROFILES ====================
function renderProfiles() {
  const profiles = [
    { name: 'KRISH RAMANI', id: 'CUST001', type: 'Savings+FD', risk: 0.72, branch: 'Mumbai_Andheri', income: '₹12L', flow: '₹1.2Cr/mo', flags: ['Velocity Spike', 'Profile Mismatch', 'Hub Node'] },
    { name: 'ARJUN MEHTA', id: 'CUST042', type: 'Current', risk: 0.45, branch: 'Mumbai_Dadar', income: '₹25L', flow: '₹18L/mo', flags: ['Dormant Reactivation'] },
    { name: 'PRIYA SHARMA', id: 'CUST089', type: 'Savings', risk: 0.91, branch: 'Pune_Koregaon', income: '₹8L', flow: '₹5.5Cr/mo', flags: ['Layering', 'Round-Trip', 'Structuring', 'Hawala Pattern'] }
  ];
  document.getElementById('profileArea').innerHTML = profiles.map(p => {
    const rc = p.risk > 0.7 ? 'risk-high' : p.risk > 0.4 ? 'risk-med' : 'risk-low';
    return `<div class="profile-card ${rc}"><div class="profile-avatar"><i class="ri-user-3-line"></i></div><div class="profile-info"><h3>${p.name}</h3><div style="font-size:11px;color:#505050;margin:3px 0;font-family:'Share Tech Mono',monospace;letter-spacing:0.5px">${p.id} · ${p.type} · ${p.branch}</div><div style="font-size:12px;margin:3px 0;color:#8a8a8a">Income: ${p.income} | Flow: ${p.flow}</div><div class="risk-gauge"><div class="risk-gauge-fill" style="width:${p.risk * 100}%"></div></div><div style="font-size:10px;color:#505050;font-family:'Share Tech Mono',monospace">Risk: ${(p.risk * 100).toFixed(0)}%</div><div style="margin-top:5px">${p.flags.map(f => `<span class="flag-tag">${f}</span>`).join('')}</div></div></div>`;
  }).join('');
}

// ==================== D3 FORCE GRAPH ====================
function initForceGraph() {
  const container = document.getElementById('graph-container');
  const w = container.clientWidth, h = container.clientHeight;
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.3, 5]).on('zoom', e => g.attr('transform', e.transform)));
  const nodes = graphNodes.map(d => ({ ...d }));
  const edges = graphEdges.filter(e => nodes.find(n => n.id === e.source) && nodes.find(n => n.id === e.target)).map(d => ({ ...d }));
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(edges).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-180))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('collision', d3.forceCollide(18));
  const link = g.selectAll('.link').data(edges).enter().append('line')
    .attr('stroke', d => d.suspicious ? '#ff3d3d' : 'rgba(60,60,60,0.4)')
    .attr('stroke-width', d => Math.max(1, Math.log(d.amount / 100000) * 0.8))
    .attr('stroke-dasharray', d => d.suspicious ? '4,4' : 'none');
  const node = g.selectAll('.node').data(nodes).enter().append('circle')
    .attr('r', d => Math.max(5, Math.sqrt(d.value / 500000)))
    .attr('fill', d => d.risk > 0.7 ? '#ff3d3d' : d.risk > 0.4 ? '#ffca28' : '#00e676')
    .attr('stroke', '#1a1a1a').attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .call(d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }).on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; }).on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
  const tooltip = document.getElementById('graphTooltip');
  node.on('mouseover', (e, d) => {
    tooltip.style.display = 'block'; tooltip.style.left = (e.pageX + 12) + 'px'; tooltip.style.top = (e.pageY - 8) + 'px';
    tooltip.innerHTML = `<strong style="color:#fff">${d.name}</strong><br>Account: ${d.id}<br>Type: ${d.type}<br>Branch: ${d.branch}<br>Risk: <span style="color:${d.risk > 0.7 ? '#ff3d3d' : '#00e676'}"> ${(d.risk * 100).toFixed(0)}%</span><br>Value: ${fmt(d.value)}${d.dormant ? '<br><span style="color:#ff9800">⚠ DORMANT</span>' : ''}`;
    d3.select(e.currentTarget).transition().duration(150).attr('r', d => Math.max(8, Math.sqrt(d.value / 500000) * 1.4));
  }).on('mouseout', (e, d) => {
    tooltip.style.display = 'none'; d3.select(e.currentTarget).transition().duration(150).attr('r', d => Math.max(5, Math.sqrt(d.value / 500000)));
  }).on('click', (e, d) => {
    const connected = new Set(); edges.forEach(edge => { if ((edge.source.id || edge.source) === d.id) connected.add(edge.target.id || edge.target); if ((edge.target.id || edge.target) === d.id) connected.add(edge.source.id || edge.source); });
    node.transition().duration(200).attr('opacity', n => connected.has(n.id) || n.id === d.id ? 1 : 0.1);
    link.transition().duration(200).attr('opacity', l => (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id ? 1 : 0.03);
    setTimeout(() => { node.transition().duration(400).attr('opacity', 1); link.transition().duration(400).attr('opacity', 1); }, 3000);
  });
  g.selectAll('.label').data(nodes.filter(d => d.risk > 0.6)).enter().append('text')
    .attr('font-size', '7px').attr('fill', '#666').attr('font-family', 'Share Tech Mono, monospace').attr('text-anchor', 'middle').attr('dy', -10).text(d => d.name);
  sim.on('tick', () => { link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y); node.attr('cx', d => d.x).attr('cy', d => d.y); g.selectAll('text').attr('x', d => d.x).attr('y', d => d.y); });
}
function updateForceGraph() {
  graphNodes.push(...genNodes(2)); graphEdges.push(...genEdges(graphNodes, 3));
  if (window._graphInit) { document.getElementById('graph-container').innerHTML = '<div class="tooltip" id="graphTooltip"></div>'; window._graphInit = false; initForceGraph(); window._graphInit = true; }
}

// ==================== LINE CHART ====================
let chartOffset = 0;
const numPoints = 80;

function drawLineChart(containerId) {
  const container = document.getElementById(containerId); if (!container) return;
  const w = container.clientWidth || 600, h = container.clientHeight || 260;

  if (!container._d3init) {
    container.innerHTML = '';
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
    const mx = { l: 40, r: 15, t: 15, b: 28 };

    // Axes and grid
    const yS = d3.scaleLinear().domain([0, 100]).range([h - mx.b, mx.t]);
    svg.selectAll('.grid').data(yS.ticks(5)).enter().append('line')
      .attr('x1', mx.l).attr('x2', w - mx.r).attr('y1', d => yS(d)).attr('y2', d => yS(d)).attr('stroke', 'rgba(255,255,255,0.03)');

    // Gradients
    const defs = svg.append('defs');
    const mkGrad = (id, c1, c2) => {
      const g = defs.append('linearGradient').attr('id', id).attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
      g.append('stop').attr('offset', '0%').attr('stop-color', c1);
      g.append('stop').attr('offset', '100%').attr('stop-color', c2);
    };
    mkGrad(`g1-${containerId}`, 'rgba(139,92,246,0.3)', 'rgba(139,92,246,0)'); // Purple
    mkGrad(`g2-${containerId}`, 'rgba(6,182,212,0.3)', 'rgba(6,182,212,0)');   // Cyan
    mkGrad(`g3-${containerId}`, 'rgba(59,130,246,0.3)', 'rgba(59,130,246,0)');  // Blue

    container._d3svg = svg;
    container._d3mx = mx;
    container._d3init = true;

    // Create paths
    svg.append('path').attr('class', 'area3').attr('fill', `url(#g3-${containerId})`);
    svg.append('path').attr('class', 'line3').attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', 2);

    svg.append('path').attr('class', 'area2').attr('fill', `url(#g2-${containerId})`);
    svg.append('path').attr('class', 'line2').attr('fill', 'none').attr('stroke', '#06b6d4').attr('stroke-width', 2);

    svg.append('path').attr('class', 'area1').attr('fill', `url(#g1-${containerId})`);
    svg.append('path').attr('class', 'line1').attr('fill', 'none').attr('stroke', '#8b5cf6').attr('stroke-width', 2);

    // X Axis group
    svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${h - mx.b})`);
    svg.append('g').attr('class', 'y-axis').attr('transform', `translate(${mx.l},0)`).call(d3.axisLeft(yS).ticks(5)).selectAll('text').attr('fill', '#505050').attr('font-size', '9px').attr('font-family', 'Share Tech Mono, monospace');
    svg.selectAll('.domain,.tick line').attr('stroke', 'rgba(255,255,255,0.04)');
  }

  // Data generation using combined sine waves to make smooth, fluid, wavy lines
  const svg = container._d3svg;
  const mx = container._d3mx;
  const xS = d3.scaleLinear().domain([0, numPoints - 1]).range([mx.l, w - mx.r]);
  const yS = d3.scaleLinear().domain([0, 100]).range([h - mx.b, mx.t]);

  const d1 = [], d2 = [], d3_arr = [];
  for (let i = 0; i < numPoints; i++) {
    const x = i + chartOffset;
    // Made the sine waves faster and added higher frequency components to look like active data
    const y1 = 45 + 30 * Math.sin(x * 0.12) + 15 * Math.sin(x * 0.25) + 10 * Math.sin(x * 0.5);
    const y2 = 35 + 22 * Math.sin(x * 0.15 + 2) + 14 * Math.sin(x * 0.3 + 1);
    const y3 = 25 + 18 * Math.sin(x * 0.1 + 4) + 12 * Math.sin(x * 0.2 + 3) + 8 * Math.sin(x * 0.4);

    d1.push({ x: i, y: Math.max(0, Math.min(100, y1)) });
    d2.push({ x: i, y: Math.max(0, Math.min(100, y2)) });
    d3_arr.push({ x: i, y: Math.max(0, Math.min(100, y3)) });
  }

  const area = d3.area().x((_, i) => xS(i)).y0(h - mx.b).y1(d => yS(d.y)).curve(d3.curveCatmullRom.alpha(0.5));
  const line = d3.line().x((_, i) => xS(i)).y(d => yS(d.y)).curve(d3.curveCatmullRom.alpha(0.5));

  svg.select('.area1').attr('d', area(d1));
  svg.select('.line1').attr('d', line(d1));
  svg.select('.area2').attr('d', area(d2));
  svg.select('.line2').attr('d', line(d2));
  svg.select('.area3').attr('d', area(d3_arr));
  svg.select('.line3').attr('d', line(d3_arr));

  const step = Math.floor(chartOffset);
  const xLabels = d3.axisBottom(xS).ticks(8).tickFormat(d => `T${Math.abs((d - step) % 100)}`);
  svg.select('.x-axis').call(xLabels).selectAll('text').attr('fill', '#505050').attr('font-size', '9px').attr('font-family', 'Share Tech Mono, monospace');
}

function initLineChart() {
  drawLineChart('linechart-container');
  drawLineChart('dash-velocity');

  if (!window._chartAnim) {
    function animateCharts() {
      chartOffset -= 0.25; // Increased speed of movement
      drawLineChart('linechart-container');
      drawLineChart('dash-velocity');
      window._chartAnim = requestAnimationFrame(animateCharts);
    }
    animateCharts();
  }
}

function updateLineChart() {
  // Now handled continuously by requestAnimationFrame
}

// ==================== SANKEY (PREMIUM) ====================
function drawSankey(containerId) {
  const container = document.getElementById(containerId); if (!container) return;
  container.innerHTML = '';
  const w = container.clientWidth || 700, h = container.clientHeight || 300;
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
  const defs = svg.append('defs');

  // ---- Node data with realistic values ----
  const nodeData = [
    // Sources (column 0)
    { id: 'savings', label: 'Savings', col: 0, color: '#8b5cf6', value: 4200 },
    { id: 'current', label: 'Current', col: 0, color: '#06b6d4', value: 3100 },
    { id: 'fd', label: 'Fixed Dep', col: 0, color: '#3b82f6', value: 1800 },
    { id: 'loan', label: 'Loan', col: 0, color: '#f59e0b', value: 900 },
    // Channels (column 1)
    { id: 'upi', label: 'UPI', col: 1, color: '#10b981', value: 3800 },
    { id: 'neft', label: 'NEFT', col: 1, color: '#06b6d4', value: 2200 },
    { id: 'rtgs', label: 'RTGS', col: 1, color: '#8b5cf6', value: 1600 },
    { id: 'atm', label: 'ATM', col: 1, color: '#f59e0b', value: 1400 },
    { id: 'branch', label: 'Branch', col: 1, color: '#ef4444', value: 1000 },
    // Destinations (column 2)
    { id: 'cleared', label: 'Cleared', col: 2, color: '#10b981', value: 5800 },
    { id: 'flagged', label: 'Flagged', col: 2, color: '#f59e0b', value: 2100 },
    { id: 'suspicious', label: 'Suspicious', col: 2, color: '#ef4444', value: 1500 },
    { id: 'blocked', label: 'Blocked', col: 2, color: '#dc2626', value: 600 },
  ];

  // ---- Link data with volumes ----
  const linkData = [
    { source: 'savings', target: 'upi', value: 1800 },
    { source: 'savings', target: 'neft', value: 1200 },
    { source: 'savings', target: 'rtgs', value: 800 },
    { source: 'savings', target: 'branch', value: 400 },
    { source: 'current', target: 'upi', value: 1400 },
    { source: 'current', target: 'neft', value: 800 },
    { source: 'current', target: 'atm', value: 900 },
    { source: 'fd', target: 'rtgs', value: 800 },
    { source: 'fd', target: 'neft', value: 600 },
    { source: 'fd', target: 'branch', value: 400 },
    { source: 'loan', target: 'upi', value: 600 },
    { source: 'loan', target: 'atm', value: 300 },
    { source: 'upi', target: 'cleared', value: 2400 },
    { source: 'upi', target: 'flagged', value: 800 },
    { source: 'upi', target: 'suspicious', value: 600 },
    { source: 'neft', target: 'cleared', value: 1600 },
    { source: 'neft', target: 'flagged', value: 400 },
    { source: 'neft', target: 'suspicious', value: 200 },
    { source: 'rtgs', target: 'cleared', value: 1000 },
    { source: 'rtgs', target: 'flagged', value: 400 },
    { source: 'rtgs', target: 'blocked', value: 200 },
    { source: 'atm', target: 'cleared', value: 600 },
    { source: 'atm', target: 'suspicious', value: 500 },
    { source: 'atm', target: 'blocked', value: 300 },
    { source: 'branch', target: 'cleared', value: 200 },
    { source: 'branch', target: 'flagged', value: 500 },
    { source: 'branch', target: 'blocked', value: 100 },
  ];

  // ---- Layout parameters ----
  const pad = { l: 10, r: 10, t: 20, b: 10 };
  const nodeW = 18;
  const colPositions = [pad.l, w * 0.38, w * 0.76];
  const nodePad = 8;

  // ---- Position nodes vertically per column ----
  const columns = [[], [], []];
  nodeData.forEach(n => columns[n.col].push(n));

  columns.forEach((col, ci) => {
    const totalVal = col.reduce((a, n) => a + n.value, 0);
    const availH = h - pad.t - pad.b - (col.length - 1) * nodePad;
    let yOff = pad.t;
    col.forEach(n => {
      const nh = Math.max(16, (n.value / totalVal) * availH);
      n.x = colPositions[ci];
      n.y = yOff;
      n.h = nh;
      yOff += nh + nodePad;
    });
  });

  const nodeMap = {};
  nodeData.forEach(n => nodeMap[n.id] = n);

  // ---- Compute link vertical positions ----
  // Track how much of each node's vertical space has been consumed by links
  const srcOff = {}, tgtOff = {};
  nodeData.forEach(n => { srcOff[n.id] = 0; tgtOff[n.id] = 0; });

  const maxLinkVal = Math.max(...linkData.map(l => l.value));

  linkData.forEach(l => {
    const sn = nodeMap[l.source], tn = nodeMap[l.target];
    const sTotal = linkData.filter(x => x.source === l.source).reduce((a, x) => a + x.value, 0);
    const tTotal = linkData.filter(x => x.target === l.target).reduce((a, x) => a + x.value, 0);
    const sw = (l.value / sTotal) * sn.h;
    const tw = (l.value / tTotal) * tn.h;
    l.sy = sn.y + srcOff[l.source];
    l.ty = tn.y + tgtOff[l.target];
    l.sw = sw;
    l.tw = tw;
    srcOff[l.source] += sw;
    tgtOff[l.target] += tw;
  });

  // ---- Create gradient for each link ----
  linkData.forEach((l, i) => {
    const sn = nodeMap[l.source], tn = nodeMap[l.target];
    const grad = defs.append('linearGradient')
      .attr('id', `skg-${containerId}-${i}`)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', sn.x + nodeW).attr('y1', 0)
      .attr('x2', tn.x).attr('y2', 0);
    grad.append('stop').attr('offset', '0%').attr('stop-color', sn.color).attr('stop-opacity', 0.5);
    grad.append('stop').attr('offset', '100%').attr('stop-color', tn.color).attr('stop-opacity', 0.5);
  });

  // ---- Glow filter ----
  const glow = defs.append('filter').attr('id', `glow-${containerId}`).attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
  glow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '3').attr('result', 'blur');
  const merge = glow.append('feMerge');
  merge.append('feMergeNode').attr('in', 'blur');
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  // ---- Draw links ----
  const linkGroup = svg.append('g').attr('class', 'links');
  const linkPaths = linkData.map((l, i) => {
    const sn = nodeMap[l.source], tn = nodeMap[l.target];
    const x0 = sn.x + nodeW, x1 = tn.x;
    const y0s = l.sy, y0e = l.sy + l.sw;
    const y1s = l.ty, y1e = l.ty + l.tw;
    const cpx = (x0 + x1) / 2;

    const path = `M${x0},${y0s} C${cpx},${y0s} ${cpx},${y1s} ${x1},${y1s} L${x1},${y1e} C${cpx},${y1e} ${cpx},${y0e} ${x0},${y0e} Z`;

    return linkGroup.append('path')
      .attr('d', path)
      .attr('fill', `url(#skg-${containerId}-${i})`)
      .attr('stroke', 'none')
      .attr('opacity', 0.35)
      .style('transition', 'opacity 0.3s ease')
      .on('mouseover', function () {
        d3.select(this).attr('opacity', 0.7).attr('filter', `url(#glow-${containerId})`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.35).attr('filter', 'none');
      });
  });

  // ---- Draw animated particles flowing along links ----
  function createParticles() {
    linkData.forEach((l, i) => {
      if (Math.random() > 0.5) return; // not every link every frame
      const sn = nodeMap[l.source], tn = nodeMap[l.target];
      const x0 = sn.x + nodeW, x1 = tn.x;
      const y0 = l.sy + l.sw / 2, y1 = l.ty + l.tw / 2;
      const cpx = (x0 + x1) / 2;

      const particle = svg.append('circle')
        .attr('r', Math.max(1.5, (l.value / maxLinkVal) * 3))
        .attr('fill', sn.color)
        .attr('opacity', 0.8)
        .attr('filter', `url(#glow-${containerId})`);

      const dur = 1500 + Math.random() * 2000;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${x0},${y0} C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`);
      const pathLen = path.getTotalLength();

      let start = null;
      function step(ts) {
        if (!start) start = ts;
        const prog = (ts - start) / dur;
        if (prog >= 1) { particle.remove(); return; }
        const pt = path.getPointAtLength(prog * pathLen);
        particle.attr('cx', pt.x).attr('cy', pt.y).attr('opacity', 0.8 * (1 - prog * 0.5));
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  // Spawn particles periodically
  setInterval(createParticles, 400);
  createParticles();

  // ---- Draw nodes ----
  const nodeGroup = svg.append('g').attr('class', 'nodes');
  nodeData.forEach(n => {
    // Node bar with rounded corners and glowing border
    nodeGroup.append('rect')
      .attr('x', n.x).attr('y', n.y)
      .attr('width', nodeW).attr('height', n.h)
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', n.color)
      .attr('opacity', 0.85)
      .attr('stroke', n.color)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1)
      .attr('filter', `url(#glow-${containerId})`)
      .style('cursor', 'pointer')
      .on('mouseover', function () {
        d3.select(this).attr('opacity', 1).attr('stroke-opacity', 0.8);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.85).attr('stroke-opacity', 0.3);
      });

    // Label
    const lx = n.col === 2 ? n.x + nodeW + 6 : (n.col === 0 ? n.x + nodeW + 6 : n.x - 6);
    const anchor = n.col === 1 ? 'end' : 'start';
    nodeGroup.append('text')
      .attr('x', lx).attr('y', n.y + n.h / 2)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', anchor)
      .attr('fill', '#e0e0e0')
      .attr('font-size', '10px')
      .attr('font-family', 'Share Tech Mono, monospace')
      .attr('letter-spacing', '0.5px')
      .text(n.label);

    // Value badge
    const vx = n.col === 2 ? n.x + nodeW + 6 : (n.col === 0 ? n.x + nodeW + 6 : n.x - 6);
    nodeGroup.append('text')
      .attr('x', vx).attr('y', n.y + n.h / 2 + 12)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', anchor)
      .attr('fill', '#666')
      .attr('font-size', '8px')
      .attr('font-family', 'Share Tech Mono, monospace')
      .text(`₹${(n.value / 10).toFixed(0)}L`);
  });

  // ---- Column headers ----
  const headers = ['SOURCE', 'CHANNEL', 'STATUS'];
  colPositions.forEach((x, i) => {
    svg.append('text')
      .attr('x', x + nodeW / 2).attr('y', 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#555')
      .attr('font-size', '8px')
      .attr('font-family', 'Share Tech Mono, monospace')
      .attr('letter-spacing', '2px')
      .text(headers[i]);
  });
}
function initSankey() { drawSankey('sankey-container'); }

// ==================== FULL HEATMAP ====================
function initFullHeatmap() {
  const container = document.getElementById('heatmap-container'); if (!container) return;
  container.innerHTML = '';
  const w = container.clientWidth || 800, h = container.clientHeight || 600;
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
  const cols = 10, rows = 8, pad = 6, cw = (w - 40) / cols, ch = (h - 60) / rows;
  BRANCHES.forEach((b, c) => {
    svg.append('text').attr('x', 20 + c * cw + cw / 2).attr('y', 16).attr('text-anchor', 'middle')
      .attr('fill', '#666').attr('font-size', '9px').attr('font-family', 'Share Tech Mono, monospace').text(b.split('_')[1] || b);
  });
  const metrics = ['Txn Volume', 'Avg Amount', 'Velocity', 'Fraud Rate', 'Dormant %', 'CTR Flag', 'Hub Score', 'Alert Count'];
  metrics.forEach((m, r) => {
    svg.append('text').attr('x', 14).attr('y', 35 + r * ch + ch / 2).attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle').attr('fill', '#505050').attr('font-size', '9px').attr('font-family', 'Share Tech Mono, monospace').text(m);
  });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const risk = Math.random();
      const color = risk > 0.7 ? '#ff3d3d' : risk > 0.4 ? '#ffca28' : '#00e676';
      const rect = svg.append('rect').attr('x', 20 + c * cw + pad / 2).attr('y', 25 + r * ch + pad / 2)
        .attr('width', cw - pad).attr('height', ch - pad).attr('rx', 4)
        .attr('fill', color).attr('opacity', 0.1 + risk * 0.35).style('cursor', 'pointer').style('transition', '0.15s');
      rect.on('mouseover', function () { d3.select(this).attr('opacity', 0.8).attr('stroke', '#444').attr('stroke-width', 1); })
        .on('mouseout', function () { d3.select(this).attr('opacity', 0.1 + risk * 0.35).attr('stroke', 'none'); });
      svg.append('text').attr('x', 20 + c * cw + cw / 2).attr('y', 25 + r * ch + ch / 2)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#aaa').attr('font-size', '10px').attr('font-weight', '600')
        .attr('font-family', 'Share Tech Mono, monospace')
        .text((risk * 100).toFixed(0)).style('pointer-events', 'none');
    }
  }
}

// ==================== MINI GRAPHS (Dashboard) ====================
function renderMiniGraphs() {
  const mg = document.getElementById('mini-graph');
  if (mg) {
    mg.innerHTML = ''; const w = mg.clientWidth || 400, h = mg.clientHeight || 260;
    const svg = d3.select(mg).append('svg').attr('viewBox', `0 0 ${w} ${h}`);
    const nodes = genNodes(20).map(d => ({ ...d, x: R(25, w - 25), y: R(25, h - 25) }));
    const edges = genEdges(nodes, 25);
    edges.forEach(e => {
      const s = nodes.find(n => n.id === e.source), t = nodes.find(n => n.id === e.target);
      if (s && t) svg.append('line').attr('x1', s.x).attr('y1', s.y).attr('x2', t.x).attr('y2', t.y)
        .attr('stroke', e.suspicious ? 'rgba(255,61,61,0.25)' : 'rgba(60,60,60,0.25)').attr('stroke-width', 1);
    });
    nodes.forEach(n => {
      svg.append('circle').attr('cx', n.x).attr('cy', n.y).attr('r', n.risk > 0.6 ? 4 : 3)
        .attr('fill', n.risk > 0.7 ? '#ff3d3d' : n.risk > 0.4 ? '#ffca28' : '#00e676').attr('opacity', 0.7);
    });
  }
  drawLineChart('dash-velocity');
  drawSankey('dash-sankey');
}

// ==================== LIVE UPDATES ====================
setInterval(() => { renderStats(); if (window._metricsInit) updateLineChart(); }, 5000);
setInterval(() => { if (window._graphInit) updateForceGraph(); }, 15000);

// ==================== INIT ====================
renderStats(); renderAlerts(); renderProfiles();
setTimeout(renderMiniGraphs, 300);
