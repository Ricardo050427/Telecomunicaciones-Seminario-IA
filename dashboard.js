
// ═══════════════════════════ UTILS ═══════════════════════════
const fmt = (n) => n == null ? 'N/A' : Number(n).toLocaleString('es-MX');
const fmtMXN = (n) => n == null ? 'N/A' : '$' + Number(n).toLocaleString('es-MX');
const fmtPct = (n) => n == null ? 'N/A' : (Number(n)*100).toFixed(1)+'%';
const fmtMes = (n) => n == null ? 'N/A' : Number(n).toFixed(1)+' meses';
const tierClass = (t) => (['','tier-t1','tier-t2','tier-t3','tier-t4'])[t] || 'tier-t4';
const tierLabel = (t) => (['','Tier 1','Tier 2','Tier 3','Tier 4'])[t] || 'Tier ?';

const CHART_COLORS = {
  wine: '#C0392B', wineDark: '#8B1A2E', wineLight: 'rgba(192,57,43,0.15)',
  gold: '#D4A843', goldLight: 'rgba(212,168,67,0.15)',
  teal: '#22B89E', tealLight: 'rgba(34,184,158,0.15)',
  purple: '#9B6FD0', purpleLight: 'rgba(107,63,160,0.15)',
  white: '#F0ECEC', text2: '#A09090', bg4: '#242424', border2: 'rgba(255,255,255,0.07)'
};

Chart.defaults.color = CHART_COLORS.text2;
Chart.defaults.borderColor = CHART_COLORS.border2;
Chart.defaults.font.family = "'Inter', sans-serif";

// ═══════════════════════════ STATE ═══════════════════════════
let params = { ...PANEL_BASE };

// ═══════════════════════════ TABS ═══════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'simulador') updateSimulator();
    if (btn.dataset.tab === 'resumen') { setTimeout(function(){ if(mapaInstance) mapaInstance.invalidateSize(); else initMapaTorres(); }, 150); }
  });
});

// ═══════════════════════════ MODAL ═══════════════════════════
const overlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
document.getElementById('modal-close').addEventListener('click', () => overlay.style.display = 'none');
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });

function openModal(html) {
  modalContent.innerHTML = html;
  overlay.style.display = 'flex';
}

function ruralModalHTML(r) {
  const losRatio = r.mercado_bruto > 0 ? Math.round(r.mercado_viable / r.mercado_bruto * 100) : 0;
  return `
    <div class="modal-title">📡 ${r.nombre}</div>
    <div class="modal-sub">ID Torre: ${r.id || '—'} &nbsp;·&nbsp; ${r.tecnologia}</div>
    <div class="modal-grid">
      <div class="modal-metric"><div class="modal-metric-label">Mercado Bruto</div><div class="modal-metric-value">${fmt(r.mercado_bruto)} hogares</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Mercado Viable (LoS)</div><div class="modal-metric-value" style="color:#4DC88A">${fmt(r.mercado_viable)} hogares</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Perdido por Cerros</div><div class="modal-metric-value" style="color:#C0392B">${fmt(r.perdido_cerros)} hogares</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Nivel de Inversión</div><div class="modal-metric-value"><span class="tier-tag ${tierClass(r.tier)}">${tierLabel(r.tier)}</span></div></div>
      <div class="modal-metric"><div class="modal-metric-label">MRR Proyectado</div><div class="modal-metric-value" style="color:#D4A843">${fmtMXN(r.mrr)}/mes</div></div>
      <div class="modal-metric"><div class="modal-metric-label">CAPEX (CPE)</div><div class="modal-metric-value" style="color:#C0392B">${fmtMXN(r.capex)}</div></div>
      <div class="modal-metric"><div class="modal-metric-label">ROI Estimado</div><div class="modal-metric-value" style="color:#22B89E">${fmtMes(r.roi)}</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Coberturas Previas</div><div class="modal-metric-value" style="font-size:.82rem">${r.coberturas || '—'}</div></div>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-label-row"><span>Eficiencia LoS</span><span>${losRatio}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${losRatio}%"></div></div>
    </div>
    <div style="margin-top:20px">
      <div class="modal-section-title">Localidades Cubiertas</div>
      <div class="modal-locs">${r.localidades || '—'}</div>
    </div>
    <div style="margin-top:16px">
      <div class="modal-section-title">Estrategia</div>
      <div class="modal-locs">${r.estrategia || '—'}</div>
    </div>`;
}

function subModalHTML(r) {
  const losRatio = r.mercado_bruto > 0 ? Math.round(r.mercado_viable / r.mercado_bruto * 100) : 0;
  return `
    <div class="modal-title">🏘️ ${r.nombre}</div>
    <div class="modal-sub">${r.tecnologia} &nbsp;·&nbsp; Dist. prom: ${r.distancia_prom ? parseFloat(r.distancia_prom).toFixed(1)+' km' : '—'}</div>
    <div class="modal-grid">
      <div class="modal-metric"><div class="modal-metric-label">Mercado Bruto</div><div class="modal-metric-value">${fmt(r.mercado_bruto)} hogares</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Mercado Viable (LoS)</div><div class="modal-metric-value" style="color:#4DC88A">${fmt(r.mercado_viable)} hogares</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Localidades Totales</div><div class="modal-metric-value">${fmt(r.localidades_total)}</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Nivel de Inversión</div><div class="modal-metric-value"><span class="tier-tag ${tierClass(r.tier)}">${tierLabel(r.tier)}</span></div></div>
      <div class="modal-metric"><div class="modal-metric-label">MRR Proyectado</div><div class="modal-metric-value" style="color:#D4A843">${fmtMXN(r.mrr)}/mes</div></div>
      <div class="modal-metric"><div class="modal-metric-label">CAPEX (CPE)</div><div class="modal-metric-value" style="color:#C0392B">${fmtMXN(r.capex)}</div></div>
      <div class="modal-metric"><div class="modal-metric-label">ROI Estimado</div><div class="modal-metric-value" style="color:#22B89E">${fmtMes(r.roi)}</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Perdido por Cerros</div><div class="modal-metric-value" style="color:#C0392B">${fmt(r.perdido_cerros)} hogares</div></div>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-label-row"><span>Eficiencia LoS</span><span>${losRatio}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${losRatio}%"></div></div>
    </div>
    <div style="margin-top:20px">
      <div class="modal-section-title">Localidades Cubiertas</div>
      <div class="modal-locs">${r.localidades || '—'}</div>
    </div>
    <div style="margin-top:16px">
      <div class="modal-section-title">Estrategia</div>
      <div class="modal-locs">${r.estrategia || '—'}</div>
    </div>`;
}

function urbanModalHTML(r) {
  return `
    <div class="modal-title">🏙️ ${r.localidad}</div>
    <div class="modal-sub">Municipio: ${r.municipio} &nbsp;·&nbsp; ${r.tecnologia}</div>
    <div class="modal-grid">
      <div class="modal-metric"><div class="modal-metric-label">Viviendas Habitadas</div><div class="modal-metric-value">${fmt(r.viviendas_hab)}</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Sin Internet</div><div class="modal-metric-value" style="color:#C0392B">${fmt(r.sin_internet)} (${r.pct_sin}%)</div></div>
      <div class="modal-metric"><div class="modal-metric-label">Nodos AP Necesarios</div><div class="modal-metric-value">${fmt(r.nodos)}</div></div>
      <div class="modal-metric"><div class="modal-metric-label">CAPEX Nodos</div><div class="modal-metric-value" style="color:#C0392B">${fmtMXN(r.capex)}</div></div>
      <div class="modal-metric"><div class="modal-metric-label">MRR Proyectado</div><div class="modal-metric-value" style="color:#D4A843">${fmtMXN(r.mrr)}/mes</div></div>
      <div class="modal-metric"><div class="modal-metric-label">ROI Estimado</div><div class="modal-metric-value" style="color:#22B89E">${fmtMes(r.roi)}</div></div>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-label-row"><span>Penetración sin internet</span><span>${r.pct_sin}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(r.pct_sin,100)}%;background:linear-gradient(90deg,var(--purple),#9B6FD0)"></div></div>
    </div>
    <div style="margin-top:20px">
      <div class="modal-section-title">Estrategia</div>
      <div class="modal-locs">${r.estrategia || '—'}</div>
    </div>`;
}

// ═══════════════════════════ CARDS RENDER ═══════════════════════════
function calcRural(r) {
  const v = r.mercado_viable;
  const mrr = Math.round(v * params.rural_adopt * params.rural_ticket);
  const capex = Math.round(v * params.rural_adopt * params.cpe_cost);
  const roi = mrr > 0 ? (capex / mrr).toFixed(1) : null;
  return { mrr, capex, roi };
}
function calcSub(r) {
  const v = r.mercado_viable;
  const mrr = Math.round(v * params.sub_adopt * params.sub_ticket);
  const capex = Math.round(v * params.sub_adopt * params.cpe_cost);
  const roi = mrr > 0 ? (capex / mrr).toFixed(1) : null;
  return { mrr, capex, roi };
}
function calcUrb(r) {
  const v = r.sin_internet;
  const mrr = Math.round(v * params.urb_adopt * params.urb_ticket);
  const users = Math.round(v * params.urb_adopt);
  const nodos = Math.ceil(users / params.urb_users_nodo);
  const capex = nodos * params.urb_nodo_cost;
  const roi = mrr > 0 ? (capex / mrr).toFixed(1) : null;
  return { mrr, capex, nodos, roi };
}

function renderRuralCard(r, idx) {
  const c = calcRural(r);
  return `<div class="node-card" data-type="rural" data-idx="${idx}">
    <div class="node-card-top">
      <div class="node-card-name">📡 ${r.nombre}</div>
      <div class="node-card-meta">
        <span class="tier-tag ${tierClass(r.tier)}">${tierLabel(r.tier)}</span>
        <span style="font-size:.68rem;color:var(--text3)">${r.tecnologia}</span>
      </div>
    </div>
    <div class="node-card-body">
      <div class="node-metrics">
        <div><div class="metric-label">Mercado Viable</div><div class="metric-value green">${fmt(r.mercado_viable)}</div></div>
        <div><div class="metric-label">Mercado Bruto</div><div class="metric-value">${fmt(r.mercado_bruto)}</div></div>
        <div><div class="metric-label">MRR Proyectado</div><div class="metric-value gold">${fmtMXN(c.mrr)}</div></div>
        <div><div class="metric-label">ROI</div><div class="metric-value">${c.roi ? c.roi+' meses' : 'N/A'}</div></div>
      </div>
    </div>
    <div class="node-card-footer">🏔️ Perdido x cerros: ${fmt(r.perdido_cerros)} &nbsp;|&nbsp; CAPEX: ${fmtMXN(c.capex)}</div>
  </div>`;
}

function renderSubCard(r, idx) {
  const c = calcSub(r);
  const distSpan = r.distancia_prom ? '<span style="font-size:.68rem;color:var(--text3)">' + parseFloat(r.distancia_prom).toFixed(1) + ' km</span>' : '';
  const roiTxt = c.roi ? c.roi + ' meses' : 'N/A';
  return '<div class="node-card" data-type="sub" data-idx="' + idx + '">'
    + '<div class="node-card-top">'
    +   '<div class="node-card-name">&#127960; ' + r.nombre + '</div>'
    +   '<div class="node-card-meta">'
    +     '<span class="tier-tag ' + tierClass(r.tier) + '">' + tierLabel(r.tier) + '</span>'
    +     '<span style="font-size:.68rem;color:var(--text3)">' + r.localidades_total + ' localidades</span>'
    +     distSpan
    +   '</div>'
    + '</div>'
    + '<div class="node-card-body"><div class="node-metrics">'
    +   '<div><div class="metric-label">Mercado Viable</div><div class="metric-value green">' + fmt(r.mercado_viable) + '</div></div>'
    +   '<div><div class="metric-label">Mercado Bruto</div><div class="metric-value">' + fmt(r.mercado_bruto) + '</div></div>'
    +   '<div><div class="metric-label">MRR Proyectado</div><div class="metric-value gold">' + fmtMXN(c.mrr) + '</div></div>'
    +   '<div><div class="metric-label">ROI</div><div class="metric-value">' + roiTxt + '</div></div>'
    + '</div></div>'
    + '<div class="node-card-footer">&#128225; ' + r.tecnologia + ' &nbsp;|&nbsp; CAPEX: ' + fmtMXN(c.capex) + '</div>'
    + '</div>';
}

function renderUrbanCard(r, idx) {
  const c = calcUrb(r);
  const pct = Math.min(r.pct_sin, 100);
  return `<div class="node-card" data-type="urb" data-idx="${idx}">
    <div class="node-card-top" style="background:linear-gradient(135deg,var(--bg4),rgba(107,63,160,0.1))">
      <div class="node-card-name">&#127961; ${r.localidad}</div>
      <div class="node-card-meta">
        <span style="font-size:.68rem;color:var(--text3)">Mpio. ${r.municipio}</span>
        <span style="font-size:.68rem;color:var(--text3)">${r.tecnologia}</span>
      </div>
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:.65rem;color:var(--text3);margin-bottom:4px"><span>Sin internet</span><span>${fmt(r.sin_internet)} (${r.pct_sin}%)</span></div>
        <div style="height:4px;background:var(--bg4);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--purple),#9B6FD0);border-radius:2px"></div></div>
      </div>
    </div>
    <div class="node-card-body">
      <div class="node-metrics">
        <div><div class="metric-label">Sin Internet</div><div class="metric-value" style="color:#C0392B">${fmt(r.sin_internet)}</div></div>
        <div><div class="metric-label">Viviendas Tot.</div><div class="metric-value">${fmt(r.viviendas_hab)}</div></div>
        <div><div class="metric-label">MRR Proyectado</div><div class="metric-value gold">${fmtMXN(c.mrr)}</div></div>
        <div><div class="metric-label">ROI</div><div class="metric-value">${c.roi ? c.roi+' meses' : 'N/A'}</div></div>
      </div>
    </div>
    <div class="node-card-footer">&#128225; Nodos AP: ${fmt(c.nodos)} &nbsp;|&nbsp; CAPEX: ${fmtMXN(c.capex)}</div>
  </div>`;
}

// ═══════════════════════════ RURAL TAB ═══════════════════════════
let ruralFiltered = [...DATA_RURALES];

function applyRuralFilters() {
  const search = document.getElementById('rural-search').value.toLowerCase();
  const tier = document.getElementById('rural-tier-filter').value;
  const sort = document.getElementById('rural-sort').value;
  ruralFiltered = DATA_RURALES.filter(r => {
    const matchSearch = !search || r.nombre.toLowerCase().includes(search) || (r.localidades||'').toLowerCase().includes(search);
    const matchTier = !tier || r.nivel.startsWith(tier);
    return matchSearch && matchTier;
  });
  if (sort === 'mercado') ruralFiltered.sort((a,b) => b.mercado_viable - a.mercado_viable);
  else if (sort === 'mrr') ruralFiltered.sort((a,b) => calcRural(b).mrr - calcRural(a).mrr);
  else if (sort === 'roi') ruralFiltered.sort((a,b) => { const ra=calcRural(a).roi, rb=calcRural(b).roi; return (ra||999)-(rb||999); });
  document.getElementById('rural-count-label').textContent = ruralFiltered.length + ' Torres';
  document.getElementById('rural-cards').innerHTML = ruralFiltered.map((r,i)=>renderRuralCard(r,i)).join('');
}

['rural-search','rural-tier-filter','rural-sort'].forEach(id =>
  document.getElementById(id).addEventListener('input', applyRuralFilters));

// ═══════════════════════════ SUBURBANO TAB ═══════════════════════════
let subFiltered = [...DATA_SUBURBANOS];

function applySubFilters() {
  const search = document.getElementById('sub-search').value.toLowerCase();
  const tier = document.getElementById('sub-tier-filter').value;
  const sort = document.getElementById('sub-sort').value;
  subFiltered = DATA_SUBURBANOS.filter(r => {
    const matchSearch = !search || r.nombre.toLowerCase().includes(search) || (r.localidades||'').toLowerCase().includes(search);
    const matchTier = !tier || r.nivel.startsWith(tier);
    return matchSearch && matchTier;
  });
  if (sort === 'mercado') subFiltered.sort((a,b) => b.mercado_viable - a.mercado_viable);
  else if (sort === 'mrr') subFiltered.sort((a,b) => calcSub(b).mrr - calcSub(a).mrr);
  else if (sort === 'roi') subFiltered.sort((a,b) => { const ra=calcSub(a).roi, rb=calcSub(b).roi; return (ra||999)-(rb||999); });
  else if (sort === 'localidades') subFiltered.sort((a,b) => b.localidades_total - a.localidades_total);
  document.getElementById('sub-count-label').textContent = subFiltered.length + ' Nodos';
  document.getElementById('sub-cards').innerHTML = subFiltered.map((r,i)=>renderSubCard(r,i)).join('');
}

['sub-search','sub-tier-filter','sub-sort'].forEach(id =>
  document.getElementById(id).addEventListener('input', applySubFilters));

// ═══════════════════════════ URBANO TAB ═══════════════════════════
let urbFiltered = [...DATA_URBANOS];

function applyUrbFilters() {
  const search = document.getElementById('urb-search').value.toLowerCase();
  const sort = document.getElementById('urb-sort').value;
  urbFiltered = DATA_URBANOS.filter(r =>
    !search || r.localidad.toLowerCase().includes(search) || r.municipio.toLowerCase().includes(search));
  if (sort === 'sin_internet') urbFiltered.sort((a,b) => b.sin_internet - a.sin_internet);
  else if (sort === 'mrr') urbFiltered.sort((a,b) => calcUrb(b).mrr - calcUrb(a).mrr);
  else if (sort === 'roi') urbFiltered.sort((a,b) => { const ra=calcUrb(a).roi, rb=calcUrb(b).roi; return (ra||999)-(rb||999); });
  document.getElementById('urb-count-label').textContent = urbFiltered.length + ' Ciudades';
  document.getElementById('urban-cards').innerHTML = urbFiltered.map((r,i)=>renderUrbanCard(r,i)).join('');
  renderUrbanKPIs();
}

['urb-search','urb-sort'].forEach(id =>
  document.getElementById(id).addEventListener('input', applyUrbFilters));

function renderUrbanKPIs() {
  const totalSin = DATA_URBANOS.reduce((s,r) => s + r.sin_internet, 0);
  const totalMrr = DATA_URBANOS.reduce((s,r) => s + calcUrb(r).mrr, 0);
  const totalCap = DATA_URBANOS.reduce((s,r) => s + calcUrb(r).capex, 0);
  document.getElementById('urban-kpi-row').innerHTML = `
    <div class="kpi-card kpi-tertiary" style="border:1px solid rgba(107,63,160,.3)">
      <div class="kpi-icon">📵</div>
      <div class="kpi-body"><div class="kpi-label">Total sin Internet</div><div class="kpi-value">${fmt(totalSin)}</div><div class="kpi-sub">hogares urbanos objetivo</div></div>
    </div>
    <div class="kpi-card kpi-highlight" style="border:1px solid rgba(212,168,67,.3)">
      <div class="kpi-icon">💰</div>
      <div class="kpi-body"><div class="kpi-label">MRR Urbano Total</div><div class="kpi-value">${fmtMXN(totalMrr)}</div><div class="kpi-sub">ingreso mensual proyectado</div></div>
    </div>
    <div class="kpi-card kpi-primary" style="border:1px solid rgba(139,26,46,.3)">
      <div class="kpi-icon">🏗️</div>
      <div class="kpi-body"><div class="kpi-label">CAPEX Urbano Total</div><div class="kpi-value">${fmtMXN(totalCap)}</div><div class="kpi-sub">inversión en nodos AP</div></div>
    </div>`;
}

// ═══════════════════════════ CHARTS ═══════════════════════════
let chartSegmento, chartMrrSeg, chartTiers, chartCapexMrr, simChart;

function destroyChart(c) { if (c) c.destroy(); }

function buildResumenCharts() {
  // Pie - mercado por segmento
  destroyChart(chartSegmento);
  chartSegmento = new Chart(document.getElementById('chart-segmento'), {
    type: 'doughnut',
    data: {
      labels: ['Rural', 'Suburbano', 'Urbano'],
      datasets: [{
        data: [
          DATA_RURALES.reduce((s,r) => s+r.mercado_viable,0),
          DATA_SUBURBANOS.reduce((s,r) => s+r.mercado_viable,0),
          DATA_URBANOS.reduce((s,r) => s+r.sin_internet,0)
        ],
        backgroundColor: [CHART_COLORS.wine, CHART_COLORS.teal, CHART_COLORS.purple],
        borderColor: '#1C1C1C', borderWidth: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { padding:16, font:{size:11} } } }
    }
  });

  // Bar - MRR por segmento
  destroyChart(chartMrrSeg);
  const rMrr = DATA_RURALES.reduce((s,r) => s + Math.round(r.mercado_viable*params.rural_adopt*params.rural_ticket),0);
  const sMrr = DATA_SUBURBANOS.reduce((s,r) => s + Math.round(r.mercado_viable*params.sub_adopt*params.sub_ticket),0);
  const uMrr = DATA_URBANOS.reduce((s,r) => s + Math.round(r.sin_internet*params.urb_adopt*params.urb_ticket),0);
  chartMrrSeg = new Chart(document.getElementById('chart-mrr-seg'), {
    type: 'bar',
    data: {
      labels: ['Rural','Suburbano','Urbano'],
      datasets: [{
        label: 'MRR ($MXN)',
        data: [rMrr, sMrr, uMrr],
        backgroundColor: [CHART_COLORS.wineLight, CHART_COLORS.tealLight, CHART_COLORS.purpleLight],
        borderColor: [CHART_COLORS.wine, CHART_COLORS.teal, CHART_COLORS.purple],
        borderWidth: 2, borderRadius: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { callback: v => '$'+Number(v).toLocaleString('es-MX') }, grid: { color: CHART_COLORS.border2 } },
        y: { grid: { display: false } }
      }
    }
  });

  // Tier distribution doughnut
  destroyChart(chartTiers);
  const allNodos = [...DATA_RURALES, ...DATA_SUBURBANOS];
  const t1 = allNodos.filter(r => r.tier===1).length;
  const t2 = allNodos.filter(r => r.tier===2).length;
  const t3 = allNodos.filter(r => r.tier===3).length;
  const t4 = allNodos.filter(r => r.tier===4).length;
  chartTiers = new Chart(document.getElementById('chart-tiers'), {
    type: 'doughnut',
    data: {
      labels: ['Tier 1 - Inmediata','Tier 2 - Mediano','Tier 3 - Largo','Tier 4 - Satelital'],
      datasets: [{
        data: [t1, t2, t3, t4],
        backgroundColor: ['rgba(192,57,43,0.8)','rgba(212,168,67,0.8)','rgba(107,63,160,0.8)','rgba(100,100,100,0.5)'],
        borderColor: '#1C1C1C', borderWidth: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { padding:12, font:{size:10} } } }
    }
  });

  // CAPEX vs MRR top 10 rurales
  destroyChart(chartCapexMrr);
  const top10 = [...DATA_RURALES].sort((a,b) => b.mercado_viable-a.mercado_viable).slice(0,10);
  chartCapexMrr = new Chart(document.getElementById('chart-capex-mrr'), {
    type: 'bar',
    data: {
      labels: top10.map(r => r.nombre.length>18 ? r.nombre.slice(0,16)+'…' : r.nombre),
      datasets: [
        { label:'MRR ($)', data: top10.map(r => Math.round(r.mercado_viable*params.rural_adopt*params.rural_ticket)),
          backgroundColor: CHART_COLORS.tealLight, borderColor: CHART_COLORS.teal, borderWidth:2, borderRadius:6 },
        { label:'CAPEX ($)', data: top10.map(r => Math.round(r.mercado_viable*params.rural_adopt*params.cpe_cost)),
          backgroundColor: CHART_COLORS.wineLight, borderColor: CHART_COLORS.wine, borderWidth:2, borderRadius:6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position:'top', labels:{font:{size:11}} } },
      scales: {
        y: { ticks: { callback: v => '$'+Number(v).toLocaleString('es-MX') }, grid: { color: CHART_COLORS.border2 } },
        x: { grid: { display:false } }
      }
    }
  });
}

// ═══════════════════════════ TOP TABLES ═══════════════════════════
function buildTopTables() {
  const topR = [...DATA_RURALES].sort((a,b) => b.mercado_viable-a.mercado_viable).slice(0,8);
  document.getElementById('top-rurales-body').innerHTML = topR.map(r => {
    const c = calcRural(r);
    return `<tr>
      <td style="font-weight:600">${r.nombre}</td>
      <td style="color:#4DC88A">${fmt(r.mercado_viable)}</td>
      <td><span class="tier-tag ${tierClass(r.tier)}">${tierLabel(r.tier)}</span></td>
      <td style="color:var(--gold)">${fmtMXN(c.mrr)}</td>
      <td>${c.roi ? c.roi+'m' : '—'}</td>
    </tr>`;
  }).join('');

  const topS = [...DATA_SUBURBANOS].sort((a,b) => b.mercado_viable-a.mercado_viable).slice(0,8);
  document.getElementById('top-sub-body').innerHTML = topS.map(r => {
    const c = calcSub(r);
    return `<tr>
      <td style="font-weight:600">${r.nombre}</td>
      <td style="color:#4DC88A">${fmt(r.mercado_viable)}</td>
      <td><span class="tier-tag ${tierClass(r.tier)}">${tierLabel(r.tier)}</span></td>
      <td style="color:var(--gold)">${fmtMXN(c.mrr)}</td>
      <td>${c.roi ? c.roi+'m' : '—'}</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════ KPI HEADER ═══════════════════════════
function updateHeaderKPI() {
  const rMrr = DATA_RURALES.reduce((s,r) => s + Math.round(r.mercado_viable*params.rural_adopt*params.rural_ticket),0);
  const sMrr = DATA_SUBURBANOS.reduce((s,r) => s + Math.round(r.mercado_viable*params.sub_adopt*params.sub_ticket),0);
  const uMrr = DATA_URBANOS.reduce((s,r) => s + Math.round(r.sin_internet*params.urb_adopt*params.urb_ticket),0);
  const total = rMrr + sMrr + uMrr;
  document.getElementById('total-mrr-header').textContent = fmtMXN(total);
  document.getElementById('kpi-mrr-total').textContent = fmtMXN(total);
}

// ═══════════════════════════ SIMULATOR ═══════════════════════════
const DEFAULTS = { ...PANEL_BASE };

function updateSimulator() {
  const rMrr = DATA_RURALES.reduce((s,r) => s + Math.round(r.mercado_viable*params.rural_adopt*params.rural_ticket),0);
  const sMrr = DATA_SUBURBANOS.reduce((s,r) => s + Math.round(r.mercado_viable*params.sub_adopt*params.sub_ticket),0);
  const uMrr = DATA_URBANOS.reduce((s,r) => s + Math.round(r.sin_internet*params.urb_adopt*params.urb_ticket),0);
  const rCap = DATA_RURALES.reduce((s,r) => s + Math.round(r.mercado_viable*params.rural_adopt*params.cpe_cost),0);
  const sCap = DATA_SUBURBANOS.reduce((s,r) => s + Math.round(r.mercado_viable*params.sub_adopt*params.cpe_cost),0);
  const uCap = DATA_URBANOS.reduce((s,r) => {
    const users = Math.round(r.sin_internet*params.urb_adopt);
    return s + Math.ceil(users/params.urb_users_nodo)*params.urb_nodo_cost;
  }, 0);
  const totalMrr = rMrr + sMrr + uMrr;
  const totalCap = rCap + sCap + uCap;

  document.getElementById('sim-mrr-rural').textContent = fmtMXN(rMrr);
  document.getElementById('sim-capex-rural').textContent = fmtMXN(rCap);
  document.getElementById('sim-mrr-sub').textContent = fmtMXN(sMrr);
  document.getElementById('sim-capex-sub').textContent = fmtMXN(sCap);
  document.getElementById('sim-mrr-urb').textContent = fmtMXN(uMrr);
  document.getElementById('sim-capex-urb').textContent = fmtMXN(uCap);
  // totals for header only

  updateHeaderKPI();
  buildResumenCharts();
  buildTopTables();

  // Sim chart
  destroyChart(simChart);
  simChart = new Chart(document.getElementById('sim-chart'), {
    type: 'bar',
    data: {
      labels: ['Rural','Suburbano','Urbano'],
      datasets: [
        { label:'MRR ($)', data:[rMrr,sMrr,uMrr], backgroundColor:[CHART_COLORS.tealLight,CHART_COLORS.tealLight,CHART_COLORS.tealLight], borderColor:[CHART_COLORS.teal,CHART_COLORS.teal,CHART_COLORS.teal], borderWidth:2, borderRadius:8 },
        { label:'CAPEX ($)', data:[rCap,sCap,uCap], backgroundColor:[CHART_COLORS.wineLight,CHART_COLORS.wineLight,CHART_COLORS.wineLight], borderColor:[CHART_COLORS.wine,CHART_COLORS.wine,CHART_COLORS.wine], borderWidth:2, borderRadius:8 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{position:'top'} },
      scales: {
        y:{ ticks:{callback: v=>'$'+Number(v).toLocaleString('es-MX')}, grid:{color:CHART_COLORS.border2} },
        x:{ grid:{display:false} }
      }
    }
  });
}

// Slider bindings
function bindSlider(id, valId, paramKey, fmt, mult) {
  const el = document.getElementById(id);
  const val = document.getElementById(valId);
  el.addEventListener('input', () => {
    params[paramKey] = parseFloat(el.value) * (mult||1);
    val.textContent = fmt(el.value);
    updateSimulator();
    applyRuralFilters();
    applySubFilters();
    applyUrbFilters();
  });
}

bindSlider('sim-rural-adopt','sim-rural-adopt-val','rural_adopt', v => v+'%', 0.01);
bindSlider('sim-rural-ticket','sim-rural-ticket-val','rural_ticket', v => '$'+Number(v).toLocaleString('es-MX'), 1);
bindSlider('sim-sub-adopt','sim-sub-adopt-val','sub_adopt', v => v+'%', 0.01);
bindSlider('sim-sub-ticket','sim-sub-ticket-val','sub_ticket', v => '$'+Number(v).toLocaleString('es-MX'), 1);
bindSlider('sim-urb-adopt','sim-urb-adopt-val','urb_adopt', v => v+'%', 0.01);
bindSlider('sim-urb-ticket','sim-urb-ticket-val','urb_ticket', v => '$'+Number(v).toLocaleString('es-MX'), 1);
bindSlider('sim-cpe','sim-cpe-val','cpe_cost', v => '$'+Number(v).toLocaleString('es-MX'), 1);
bindSlider('sim-nodo-cost','sim-nodo-cost-val','urb_nodo_cost', v => '$'+Number(v).toLocaleString('es-MX'), 1);

document.getElementById('reset-btn').addEventListener('click', () => {
  params = { ...DEFAULTS };
  document.getElementById('sim-rural-adopt').value = Math.round(DEFAULTS.rural_adopt*100);
  document.getElementById('sim-rural-adopt-val').textContent = Math.round(DEFAULTS.rural_adopt*100)+'%';
  document.getElementById('sim-rural-ticket').value = DEFAULTS.rural_ticket;
  document.getElementById('sim-rural-ticket-val').textContent = '$'+DEFAULTS.rural_ticket;
  document.getElementById('sim-sub-adopt').value = Math.round(DEFAULTS.sub_adopt*100);
  document.getElementById('sim-sub-adopt-val').textContent = Math.round(DEFAULTS.sub_adopt*100)+'%';
  document.getElementById('sim-sub-ticket').value = DEFAULTS.sub_ticket;
  document.getElementById('sim-sub-ticket-val').textContent = '$'+DEFAULTS.sub_ticket;
  document.getElementById('sim-urb-adopt').value = Math.round(DEFAULTS.urb_adopt*100);
  document.getElementById('sim-urb-adopt-val').textContent = Math.round(DEFAULTS.urb_adopt*100)+'%';
  document.getElementById('sim-urb-ticket').value = DEFAULTS.urb_ticket;
  document.getElementById('sim-urb-ticket-val').textContent = '$'+DEFAULTS.urb_ticket;
  document.getElementById('sim-cpe').value = DEFAULTS.cpe_cost;
  document.getElementById('sim-cpe-val').textContent = '$'+Number(DEFAULTS.cpe_cost).toLocaleString('es-MX');
  document.getElementById('sim-nodo-cost').value = DEFAULTS.urb_nodo_cost;
  document.getElementById('sim-nodo-cost-val').textContent = '$'+Number(DEFAULTS.urb_nodo_cost).toLocaleString('es-MX');
  updateSimulator();
  applyRuralFilters();
  applySubFilters();
  applyUrbFilters();
});

// ═══════════════════════════ INIT ═══════════════════════════
function init() {
  updateHeaderKPI();
  buildResumenCharts();
  buildTopTables();
  applyRuralFilters();
  applySubFilters();
  applyUrbFilters();
}

document.addEventListener('DOMContentLoaded', init);

// Event delegation - card clicks
document.addEventListener('click', function(e) {
  var card = e.target.closest('.node-card[data-type]');
  if (!card) return;
  var type = card.dataset.type;
  var idx = parseInt(card.dataset.idx);
  if (type === 'rural') openModal(ruralModalHTML(ruralFiltered[idx]));
  else if (type === 'sub') openModal(subModalHTML(subFiltered[idx]));
  else if (type === 'urb') openModal(urbanModalHTML(urbFiltered[idx]));
});


/* ════════════════════════════════════════
   MAPA INTERACTIVO DE TORRES — Leaflet.js
   ════════════════════════════════════════ */

var mapaInstance = null;
var allMarkers   = [];
var clusterGroup = null;
var mapaInited   = false;

var DEP_COLORS = {
  'Telefonía Rural': '#27AE60',
  'CFE':             '#F39C12',
  'Seguridad':       '#E74C3C',
  'Telemax':         '#E67E22',
  'Radio Sonora':    '#9B59B6',
  'SEC':             '#3498DB',
  'Hacienda':        '#1ABC9C',
  'Contraloría':     '#BDC3C7',
  'C5i':             '#8E44AD',
  'Ejecutivo':       '#2980B9',
};

function getDepColor(dep) {
  return DEP_COLORS[dep] || '#95A5A6';
}

var TIER_COLORS = {
  1: '#E74C3C',
  2: '#F39C12',
  3: '#F1C40F',
  4: '#95A5A6',
};
var TIER_LABELS = {
  1: 'Tier 1 — Inversión Inmediata',
  2: 'Tier 2 — Mediano Plazo',
  3: 'Tier 3 — Largo Plazo',
  4: 'Tier 4 — Satelital/Subsidio',
};

function getTierColor(tier) {
  return TIER_COLORS[tier] || '#95A5A6';
}

function makeTorreIcon(torre) {
  var isPort = !!torre.portafolio;
  var tier   = isPort ? torre.portafolio.tier : null;
  var color  = isPort ? getTierColor(tier) : getDepColor(torre.dep);
  var border = isPort ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,.3)';
  var size   = isPort ? 15 : 10;

  // Tier label inside the icon (number)
  var label  = isPort ? String(tier) : '';
  var labelEl = label
    ? '<text x="' + size + '" y="' + (size + 4) + '" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">' + label + '</text>'
    : '';

  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (size*2) + '" height="' + (size*2) + '">'
    + '<circle cx="' + size + '" cy="' + size + '" r="' + (size-2) + '" fill="' + color + '" stroke="' + border + '" stroke-width="2"/>'
    + labelEl
    + '</svg>';

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size*2, size*2],
    iconAnchor: [size, size],
    popupAnchor: [0, -size]
  });
}

function makeTorrePopup(t) {
  var html = '<div class="popup-nombre">📡 ' + t.nombre + '</div>';
  html += '<div class="popup-mpio">Municipio de ' + t.municipio + '</div>';
  html += '<div class="popup-meta">';
  html += '<span class="popup-tag">' + (t.tipo || '-') + '</span>';
  html += '<span class="popup-tag" style="color:' + getDepColor(t.dep) + '">' + t.dep + '</span>';
  html += '<span class="popup-tag">' + (t.estatus || '-') + '</span>';
  html += '</div>';

  if (t.portafolio) {
    var p = t.portafolio;
    var tierColors = ['','#E74C3C','#E67E22','#F1C40F','#95A5A6'];
    html += '<div class="popup-portafolio-badge">⭐ EN PORTAFOLIO — Tier ' + p.tier + '</div>';
    html += '<div class="popup-kpi-row">';
    html += '<div class="popup-kpi"><div class="pk-label">MRR</div><div class="pk-value">$' + (p.mrr||0).toLocaleString('es-MX') + '</div></div>';
    html += '<div class="popup-kpi"><div class="pk-label">CAPEX</div><div class="pk-value">$' + (p.capex||0).toLocaleString('es-MX') + '</div></div>';
    html += '<div class="popup-kpi"><div class="pk-label">ROI</div><div class="pk-value">' + (p.roi ? p.roi + ' m' : 'N/A') + '</div></div>';
    html += '</div>';
    html += '<div class="popup-kpi-row" style="grid-template-columns:1fr 1fr;">';
    html += '<div class="popup-kpi"><div class="pk-label">Mercado Viable</div><div class="pk-value">' + (p.mercado_viable||0).toLocaleString('es-MX') + '</div></div>';
    html += '<div class="popup-kpi"><div class="pk-label">Tecnología</div><div class="pk-value" style="font-size:.6rem">' + (p.tecnologia||'-') + '</div></div>';
    html += '</div>';

    if (p.localidades_los && p.localidades_los.length > 0) {
      html += '<div class="popup-los-title">🏘️ Localidades con LOS (' + p.localidades_los.length + '):</div>';
      html += '<ul class="popup-los-list">';
      p.localidades_los.forEach(function(loc) {
        html += '<li>' + loc + '</li>';
      });
      html += '</ul>';
    }
  }
  return html;
}

function initMapaTorres() {
  if (mapaInited) return;
  mapaInited = true;

  mapaInstance = L.map('mapa-torres', {
    center: [29.5, -110.9],
    zoom: 7,
    zoomControl: true,
    preferCanvas: true
  });

  // Dark tile layer (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(mapaInstance);

  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
      var count = cluster.getChildCount();
      var size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
      return L.divIcon({
        html: '<div><span>' + count + '</span></div>',
        className: 'marker-cluster marker-cluster-' + size,
        iconSize: [40, 40]
      });
    }
  });

  DATA_TORRES.forEach(function(t) {
    var marker = L.marker([t.lat, t.lon], { icon: makeTorreIcon(t) });
    marker.bindPopup(makeTorrePopup(t), { maxWidth: 320, minWidth: 240 });
    marker._torreData = t;
    allMarkers.push(marker);
    clusterGroup.addLayer(marker);
  });

  mapaInstance.addLayer(clusterGroup);

  // Fix: invalidateSize after tab becomes visible
  setTimeout(function() {
    if (mapaInstance) mapaInstance.invalidateSize();
  }, 200);
}

function filterMapa(dep) {
  if (!mapaInstance) return;
  clusterGroup.clearLayers();

  var filtered;
  if (dep === 'all') {
    filtered = allMarkers;
  } else if (dep === 'portafolio') {
    filtered = allMarkers.filter(function(m) { return !!m._torreData.portafolio; });
  } else if (dep === 'tier1') {
    filtered = allMarkers.filter(function(m) { return m._torreData.portafolio && m._torreData.portafolio.tier === 1; });
  } else if (dep === 'tier2') {
    filtered = allMarkers.filter(function(m) { return m._torreData.portafolio && m._torreData.portafolio.tier === 2; });
  } else if (dep === 'tier3') {
    filtered = allMarkers.filter(function(m) { return m._torreData.portafolio && m._torreData.portafolio.tier === 3; });
  } else if (dep === 'tier4') {
    filtered = allMarkers.filter(function(m) { return m._torreData.portafolio && m._torreData.portafolio.tier === 4; });
  } else {
    filtered = allMarkers.filter(function(m) { return m._torreData.dep === dep; });
  }

  filtered.forEach(function(m) { clusterGroup.addLayer(m); });
}

// Bind filter buttons
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.mapa-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.mapa-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      filterMapa(btn.dataset.dep);
    });
  });
  // Init map on load (Resumen is the default active tab)
  setTimeout(initMapaTorres, 500);
});
