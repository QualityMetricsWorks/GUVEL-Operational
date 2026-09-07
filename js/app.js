const cfg=window.GUVEL_CONFIG;let sb=null;
if(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY) sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const navItems=['Dashboard','Capture','Customers','Part Numbers','Machines','Catalog','Registers','Personnel','Settings'];
const navIcons={Dashboard:'▦',Capture:'＋',Customers:'♙','Part Numbers':'▤',Machines:'▥',Catalog:'◈',Registers:'☷',Personnel:'♙',Settings:'⚙'};
const nav=document.getElementById('nav'),view=document.getElementById('view');let current='Dashboard';
function renderNav(){nav.innerHTML=navItems.map(x=>`<button class="nav-item ${x===current?'active':''}" data-page="${x}"><span class="nav-icon" aria-hidden="true">${navIcons[x]||'•'}</span><span>${x}</span></button>`).join('');nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{current=b.dataset.page;renderNav();render();});}
function head(title,desc){return `<div class="page-head"><div><div class="eyebrow">GUVEL OPERATIONAL</div><h1>${title}</h1><p>${desc}</p></div></div>`}
function metrics(names){return `<div class="grid">${names.map(n=>`<div class="card"><div class="label">${n}</div><div class="metric">—</div><div class="label">Awaiting data</div></div>`).join('')}</div>`}
let dashboardDataLoaded=false;let dashboardLoadingPromise=null;let dashboardState={tab:'General',production:[],scrap:[],downtime:[],customers:[],parts:[],shifts:[],machines:[],cycleTimes:[],filters:{period:'This Month',from:'',to:'',customer:'',part:'',shift:'',machine:''},charts:{}};
const DASH_PERIODS=['Today','This Week','This Month','This Year','Previous Day','Previous Week','Previous Month','Previous Year'];
function localDateISO(d=new Date()){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10);}
function dateOnly(iso){return new Date(`${iso}T00:00:00`);}
function startOfWeek(d){const x=new Date(d);const day=x.getDay();const diff=day===0?-6:1-day;x.setDate(x.getDate()+diff);x.setHours(0,0,0,0);return x;}
function endOfWeek(d){const x=startOfWeek(d);x.setDate(x.getDate()+6);x.setHours(0,0,0,0);return x;}
function dateKey(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function shiftDays(d,n){const x=dateKey(d);x.setDate(x.getDate()+n);return x;}
function resolvePeriod(period,anchor=new Date()){
  const d=dateKey(anchor);let from,to,compareFrom,compareTo,label=period;
  if(period==='Today'){
    from=new Date(d);to=new Date(d);
    compareFrom=shiftDays(d,-1);compareTo=shiftDays(d,-1);
  } else if(period==='This Week'){
    from=startOfWeek(d);to=endOfWeek(d);
    compareFrom=shiftDays(from,-7);compareTo=shiftDays(to,-7);
  } else if(period==='This Month'){
    from=new Date(d.getFullYear(),d.getMonth(),1);to=new Date(d.getFullYear(),d.getMonth()+1,0);
    compareFrom=new Date(d.getFullYear(),d.getMonth()-1,1);compareTo=new Date(d.getFullYear(),d.getMonth(),0);
  } else if(period==='This Year'){
    from=new Date(d.getFullYear(),0,1);to=new Date(d.getFullYear(),11,31);
    compareFrom=new Date(d.getFullYear()-1,0,1);compareTo=new Date(d.getFullYear()-1,11,31);
  } else if(period==='Previous Day'){
    from=shiftDays(d,-1);to=shiftDays(d,-1);
    compareFrom=shiftDays(d,-2);compareTo=shiftDays(d,-2);
  } else if(period==='Previous Week'){
    const thisWeekStart=startOfWeek(d);to=shiftDays(thisWeekStart,-1);from=shiftDays(to,-6);
    compareTo=shiftDays(to,-7);compareFrom=shiftDays(from,-7);
  } else if(period==='Previous Month'){
    from=new Date(d.getFullYear(),d.getMonth()-1,1);to=new Date(d.getFullYear(),d.getMonth(),0);
    compareFrom=new Date(d.getFullYear(),d.getMonth()-2,1);compareTo=new Date(d.getFullYear(),d.getMonth()-1,0);
  } else if(period==='Previous Year'){
    from=new Date(d.getFullYear()-1,0,1);to=new Date(d.getFullYear()-1,11,31);
    compareFrom=new Date(d.getFullYear()-2,0,1);compareTo=new Date(d.getFullYear()-2,11,31);
  } else {
    from=new Date(d.getFullYear(),d.getMonth(),1);to=new Date(d.getFullYear(),d.getMonth()+1,0);
    compareFrom=new Date(d.getFullYear(),d.getMonth()-1,1);compareTo=new Date(d.getFullYear(),d.getMonth(),0);
  }
  return {period,label,from:localDateISO(from),to:localDateISO(to),compareFrom:localDateISO(compareFrom),compareTo:localDateISO(compareTo)};
}
function dashboard(){const tabs=['General','Production','Quality','Downtime'];return `<div class="page-head dashboard-page-head"><div><div class="eyebrow">GUVEL OPERATIONAL</div><h1>Dashboard</h1><p>Connected operational visibility.</p></div><div class="page-head-actions"><button id="dashboardFullscreen" class="fullscreen-btn" type="button">⛶ Full Screen</button></div></div><div class="tabs dashboard-tabs">${tabs.map((x,i)=>`<button class="tab ${i===0?'active':''}" data-dashboard-tab="${x}">${x}</button>`).join('')}</div><div id="dashboardFilters" class="panel dashboard-filter-panel"><div class="section-title"><div><h2>Dashboard Filters</h2><p>Select a period or refine the analysis with operational filters.</p></div><div class="actions" style="margin-top:0"><button id="dashboardClear" class="secondary" type="button">Clear Filters</button><button id="dashboardRefresh" class="secondary" type="button">Refresh</button></div></div><div class="form-grid dashboard-filters"><div class="field period-field"><label>Period</label><select id="dashPeriod">${DASH_PERIODS.map(x=>`<option value="${x}" ${dashboardState.filters.period===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Date From</label><input id="dashFrom" type="date"></div><div class="field"><label>Date To</label><input id="dashTo" type="date"></div><div class="field"><label>Customer</label><select id="dashCustomer"><option value="">All Customers</option></select></div><div class="field"><label>Part Number</label><select id="dashPart"><option value="">All Part Numbers</option></select></div><div class="field"><label>Shift</label><select id="dashShift"><option value="">All Shifts</option></select></div><div class="field"><label>Machine</label><select id="dashMachine"><option value="">All Machines</option></select></div></div><div id="dashboardPeriodHint" class="dashboard-period-hint"></div><div id="dashboardStatus" class="status"></div></div><div id="dash"></div>`}
function dashTab(t){dashboardState.tab=t;document.documentElement.dataset.dashboardTab=t;const dash=document.getElementById('dash');if(!dash)return;if(t==='General'){dash.innerHTML=`<div id="dashboardGeneral"></div>`;renderDashboardGeneral();return;}if(t==='Production'){dash.innerHTML=`<div id="dashboardProduction"></div>`;renderProductionDashboard();return;}if(t==='Quality'){dash.innerHTML=`<div id="dashboardQuality"></div>`;renderQualityDashboard();return;}if(t==='Downtime'){dash.innerHTML=`<div id="dashboardDowntime"></div>`;renderDowntimeDashboard();return;}dash.innerHTML=`<div class="panel dashboard-coming"><div class="eyebrow">PHASE 1.9</div><h2>${escapeHtml(t)} Dashboard</h2><p>This section is reserved for the next Dashboard subphase.</p><span class="dashboard-phase-badge">Implementation deferred</span></div>`;}
function dashboardStatus(text,type=''){const el=document.getElementById('dashboardStatus');if(!el)return;el.textContent=text;el.className=`status ${type}`;}
function dashMoney(v){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
function dashPct(v){return v==null?'N/A':`${(v*100).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}%`;}
function dashNum(v){return Number(v||0).toLocaleString(undefined,{maximumFractionDigits:2});}
function dashSignedPct(v){if(v==null)return 'N/A';const sign=v>0?'+':v<0?'−':'';return `${sign}${Math.abs(v*100).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}%`;}
function dashDelta(current,previous,mode='relative'){if(current==null||previous==null)return null;if(mode==='points')return current-previous;if(previous===0)return current===0?0:null;return (current-previous)/Math.abs(previous);}
function dashDeltaClass(delta,higherIsBetter=true){if(delta==null||Math.abs(delta)<0.000001)return 'neutral';const good=higherIsBetter?delta>0:delta<0;return good?'positive':'negative';}
function dashboardPeriod(){return resolvePeriod(dashboardState.filters.period||'This Month');}
function dashboardRange(){const f=dashboardState.filters;return {from:f.from||dashboardPeriod().from,to:f.to||dashboardPeriod().to};}
function shiftDurationSeconds(s){if(!s?.start_time||!s?.end_time)return null;const a=String(s.start_time).slice(0,8).split(':').map(Number),b=String(s.end_time).slice(0,8).split(':').map(Number);let start=a[0]*3600+a[1]*60+(a[2]||0),end=b[0]*3600+b[1]*60+(b[2]||0);if(end<=start)end+=86400;return end-start;}
function dashboardFiltered(rangeOverride=null){const f=dashboardState.filters;const range=rangeOverride||dashboardRange();const prod=dashboardState.production.filter(r=>{const rd=String(r.production_date||'').slice(0,10);return (!range.from||rd>=range.from)&&(!range.to||rd<=range.to)&&(!f.customer||r.customer_id===f.customer)&&(!f.part||r.part_number_id===f.part)&&(!f.shift||r.shift_id===f.shift)&&(!f.machine||r.machine_id===f.machine);});const ids=new Set(prod.map(r=>r.id));return {prod,scrap:dashboardState.scrap.filter(r=>ids.has(r.production_capture_id)),downtime:dashboardState.downtime.filter(r=>ids.has(r.production_capture_id))};}
function dashboardAggregate(rangeOverride=null){
 const base=dashboardFiltered(rangeOverride),d=prepareOeeData(base),m=buildOeeMetrics(d),partStats=new Map();
 let production=0,scrap=0,scrapCost=0,goodCost=0,poorCost=0;
 for(const r of d.prod){const q=Number(r.production_quantity||0),sq=d.scrapByCapture.get(r.id)||0,pieceCost=Number(r.part_numbers?.piece_cost||0),poorPieceCost=Number(r.part_numbers?.scrap_cost||0);production+=q;scrap+=sq;scrapCost+=sq*poorPieceCost;goodCost+=Math.max(0,q-sq)*pieceCost;poorCost+=sq*poorPieceCost;const ps=partStats.get(r.part_number_id)||{production:0,scrap:0};ps.production+=q;ps.scrap+=sq;partStats.set(r.part_number_id,ps);}
 const good=production-scrap,yieldRatio=production>0?good/production:null,ppm=production>0?scrap/production*1e6:null;
 const partRates=[...partStats.values()].filter(x=>x.production>0).map(x=>x.scrap/x.production),scrapPct=partRates.length?partRates.reduce((a,b)=>a+b,0)/partRates.length:null;
 const totalProducedCost=goodCost+poorCost,copqPct=totalProducedCost>0?poorCost/totalProducedCost:null;
 const daily=new Map([...m.daily.entries()].map(([k,x])=>[k,{production:x.production,scrap:x.scrap,good:x.good,oee:x.oee,availability:x.availability,performance:x.performance,quality:x.quality}]));
 return {d,production,scrap,scrapCost,good,goodCost,poorCost,totalProducedCost,copqPct,yieldRatio,scrapPct,ppm,planned:m.planned,operating:m.operating,perfNumerator:m.perfNumerator,availability:m.availability,performance:m.performance,quality:m.quality,oee:m.oee,validOee:m.valid,invalidOee:m.invalid,unknownEvents:m.groups.filter(g=>g.unknown>0).length,plannedDowntime:m.plannedDowntime,unplannedDowntime:m.unplannedDowntime,daily,partStats};
}
function dashboardComparison(){const p=dashboardPeriod(),currentRange=dashboardRange(),previousRange={from:p.compareFrom,to:p.compareTo};return {current:dashboardAggregate(currentRange),previous:dashboardAggregate(previousRange),period:p,currentRange,previousRange};}
function kpiDeltaMarkup(key,current,previous,higherIsBetter,label){if(current==null||previous==null){return `<div class="kpi-compare neutral"><span>No prior data</span><small>vs ${escapeHtml(label)}</small></div>`;}const ratioKeys=new Set(['oee','scrap','yield','copq','prod_oee','prod_availability','prod_performance','prod_quality']);const isRatio=ratioKeys.has(key);const d=isRatio?current-previous:(previous===0?(current===0?0:null):(current-previous)/Math.abs(previous));const cls=dashDeltaClass(d,higherIsBetter);const arrow=d==null?'—':d>0?'↑':d<0?'↓':'→';let text='No prior data';if(d!=null){const sign=d>0?'+':d<0?'−':'';const display=isRatio?Math.abs(d*100):Math.abs(d*100);text=`${arrow} ${sign}${display.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}%`;}return `<div class="kpi-compare ${cls}"><span>${text}</span><small>vs ${escapeHtml(label)}</small></div>`;}
function chartDestroy(key){const c=dashboardState.charts[key];if(c&&typeof c.destroy==='function')c.destroy();delete dashboardState.charts[key];}
function chartCreate(key,canvas,config){if(!window.Chart||!canvas)return;chartDestroy(key);dashboardState.charts[key]=new Chart(canvas,config);}
function niceLabels(daily){return [...daily.keys()].sort((a,b)=>a.localeCompare(b));}
const DASH_KPI_META={oee:{label:'OEE',unit:'%',formula:'OEE = Availability × Performance × Quality'},production:{label:'Production',unit:'pieces',formula:'Production = Total production quantity recorded'},scrap:{label:'Scrap',unit:'%',formula:'Scrap % = Arithmetic average of Scrap % for each Part Number in the selected scope'},ppm:{label:'PPMs',unit:'PPM',formula:'PPM = Scrap pieces ÷ Production pieces × 1,000,000'},yield:{label:'Yield',unit:'%',formula:'Yield = Good pieces ÷ Production pieces'},copq:{label:'COPQ',unit:'%',formula:'COPQ % = Poor Quality Cost ÷ Total Produced Cost'}};
const DASH_CHART_META={oee:{label:'OEE',unit:'%'},production:{label:'Production',unit:'pieces'},scrap:{label:'Scrap %',unit:'%'},ppm:{label:'PPMs',unit:'PPM'},yield:{label:'Yield',unit:'%'},copq:{label:'COPQ %',unit:'%'}};
function dashboardPrefsKey(){return `guvel_dashboard_preferences_${activeCompanyId||'default'}`;}
function dashboardPrefs(){try{const p=JSON.parse(localStorage.getItem(dashboardPrefsKey())||'{}');return {kpis:p.kpis||{},charts:p.charts||{}};}catch{return {kpis:{},charts:{}};}}
function saveDashboardPrefs(p){localStorage.setItem(dashboardPrefsKey(),JSON.stringify(p));}
function kpiInputToStored(key,raw){if(raw===''||raw==null)return null;const n=Number(raw);return Number.isFinite(n)?(DASH_KPI_META[key].unit==='%'?n/100:n):null;}
function kpiColorFor(key,value){if(value==null)return '';const c=dashboardPrefs().kpis?.[key]||{},b=c.between,g=c.greater,l=c.less;if(b?.enabled&&b.min!=null&&b.max!=null&&value>=b.min&&value<=b.max)return b.color||'';if(g?.enabled&&g.value!=null&&value>g.value)return g.color||'';if(l?.enabled&&l.value!=null&&value<l.value)return l.color||'';return '';}
function kpiGear(key){return `<button type="button" class="icon-button dashboard-config-btn" data-kpi-settings="${key}" title="Configure ${escapeHtml(DASH_KPI_META[key].label)}">⚙</button>`;}
function chartGear(key){return `<button type="button" class="icon-button dashboard-config-btn" data-chart-settings="${key}" title="Configure ${escapeHtml(DASH_CHART_META[key].label)}">⚙</button>`;}
function dashboardConfigOverlay(){let e=document.getElementById('dashboardConfigModal');if(!e){e=document.createElement('div');e.id='dashboardConfigModal';e.className='dashboard-config-overlay hidden';document.body.appendChild(e);}return e;}
function attachDashboardConfigActions(e, key, kind){
  e.querySelectorAll('[data-config-close]').forEach(btn=>btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();closeDashboardConfig();}));
  const save=e.querySelector(kind==='kpi'?'[data-kpi-save]':'[data-chart-save]');
  if(save)save.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();try{kind==='kpi'?saveKpiSettings(key):saveChartSettings(key);}catch(err){console.error('GUVEL dashboard config save error',err);dashboardStatus(err.message||'Unable to save configuration.','error');}});
  const reset=e.querySelector('[data-config-reset]');
  if(reset)reset.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();resetDashboardConfig(kind,key);});
  e.onclick=ev=>{if(ev.target===e){closeDashboardConfig();}};
}
function openKpiSettings(key){const m=DASH_KPI_META[key],c=dashboardPrefs().kpis?.[key]||{},g=c.greater||{},l=c.less||{},b=c.between||{},fmt=v=>v==null?'':(m.unit==='%'?v*100:v);const e=dashboardConfigOverlay();e.innerHTML=`<div class="dashboard-config-dialog"><div class="dashboard-config-head"><div><div class="eyebrow">KPI CONFIGURATION</div><h2>${escapeHtml(m.label)}</h2></div><button class="icon-button" data-config-close type="button">×</button></div><div class="dashboard-config-body"><div class="formula-box"><strong>Formula</strong><span>${escapeHtml(m.formula)}</span></div><div class="threshold-row"><label>Mayor que<input id="kpiGreaterValue" type="number" step="any" value="${fmt(g.value)}"></label><label>Color<input id="kpiGreaterColor" type="color" value="${g.color||'#0cc0df'}"></label><label class="check-field"><input id="kpiGreaterEnabled" type="checkbox" ${g.enabled?'checked':''}> Active</label></div><div class="threshold-row"><label>Menor que<input id="kpiLessValue" type="number" step="any" value="${fmt(l.value)}"></label><label>Color<input id="kpiLessColor" type="color" value="${l.color||'#ff3131'}"></label><label class="check-field"><input id="kpiLessEnabled" type="checkbox" ${l.enabled?'checked':''}> Active</label></div><div class="threshold-row"><label>Entre<input id="kpiBetweenMin" type="number" step="any" value="${fmt(b.min)}"></label><label>y<input id="kpiBetweenMax" type="number" step="any" value="${fmt(b.max)}"></label><label>Color<input id="kpiBetweenColor" type="color" value="${b.color||'#0cc0df'}"></label><label class="check-field"><input id="kpiBetweenEnabled" type="checkbox" ${b.enabled?'checked':''}> Active</label></div><div class="config-unit">Unit: ${escapeHtml(m.unit)}</div></div><div class="dashboard-config-foot"><button class="secondary" type="button" data-config-reset>Reset</button><div class="actions"><button class="secondary" type="button" data-config-close>Cancel</button><button class="primary" type="button" data-kpi-save="${key}">Save</button></div></div></div>`;e.classList.remove('hidden');attachDashboardConfigActions(e,key,'kpi');}
function openChartSettings(key){const m=DASH_CHART_META[key],c=dashboardPrefs().charts?.[key]||{},pct=m.unit==='%',fmt=v=>v==null?'':(pct?v*100:v),e=dashboardConfigOverlay();e.innerHTML=`<div class="dashboard-config-dialog"><div class="dashboard-config-head"><div><div class="eyebrow">CHART CONFIGURATION</div><h2>${escapeHtml(m.label)}</h2></div><button class="icon-button" data-config-close type="button">×</button></div><div class="dashboard-config-body"><div class="formula-box"><strong>Graph controls</strong><span>Optional lower limit, upper limit and objective. They are displayed as reference lines on the graph.</span></div><div class="chart-threshold-grid"><label>Min<input id="chartMin" type="number" step="any" value="${fmt(c.min)}"></label><label>Max<input id="chartMax" type="number" step="any" value="${fmt(c.max)}"></label><label>Objetivo<input id="chartTarget" type="number" step="any" value="${fmt(c.target)}"></label></div><div class="config-unit">Unit: ${escapeHtml(m.unit)}</div></div><div class="dashboard-config-foot"><button class="secondary" type="button" data-config-reset>Reset</button><div class="actions"><button class="secondary" type="button" data-config-close>Cancel</button><button class="primary" type="button" data-chart-save="${key}">Save</button></div></div></div>`;e.classList.remove('hidden');attachDashboardConfigActions(e,key,'chart');}
function closeDashboardConfig(){const e=document.getElementById('dashboardConfigModal');if(e)e.classList.add('hidden');}
function renderActiveDashboard(){if(dashboardState.tab==='Production')renderProductionDashboard();else if(dashboardState.tab==='Quality')renderQualityDashboard();else if(dashboardState.tab==='Downtime')renderDowntimeDashboard();else renderDashboardGeneral();}
function saveKpiSettings(key){const read=id=>{const el=document.getElementById(id);if(!el)throw new Error('KPI configuration control not found: '+id);const v=el.value??'';return kpiInputToStored(key,v);};const p=dashboardPrefs();p.kpis[key]={greater:{enabled:document.getElementById('kpiGreaterEnabled').checked,value:read('kpiGreaterValue'),color:document.getElementById('kpiGreaterColor').value},less:{enabled:document.getElementById('kpiLessEnabled').checked,value:read('kpiLessValue'),color:document.getElementById('kpiLessColor').value},between:{enabled:document.getElementById('kpiBetweenEnabled').checked,min:read('kpiBetweenMin'),max:read('kpiBetweenMax'),color:document.getElementById('kpiBetweenColor').value}};saveDashboardPrefs(p);closeDashboardConfig();renderActiveDashboard();}
function saveChartSettings(key){const pct=DASH_CHART_META[key].unit==='%',read=id=>{const el=document.getElementById(id);if(!el)throw new Error('Chart configuration control not found: '+id);const v=el.value??'';if(v==='')return null;const n=Number(v);return Number.isFinite(n)?(pct?n/100:n):null;};const p=dashboardPrefs();p.charts[key]={min:read('chartMin'),max:read('chartMax'),target:read('chartTarget')};saveDashboardPrefs(p);closeDashboardConfig();renderActiveDashboard();}
function resetDashboardConfig(kind,key){const p=dashboardPrefs();if(kind==='kpi')delete p.kpis[key];else delete p.charts[key];saveDashboardPrefs(p);closeDashboardConfig();renderActiveDashboard();}
function bindDashboardConfig(){document.querySelectorAll('[data-kpi-settings]').forEach(b=>b.onclick=()=>openKpiSettings(b.dataset.kpiSettings));document.querySelectorAll('[data-chart-settings]').forEach(b=>b.onclick=()=>openChartSettings(b.dataset.chartSettings));}
function chartReferenceDatasets(key,labels){const c=dashboardPrefs().charts?.[key]||{},make=(v,label,dash)=>v==null?null:{label,data:labels.map(()=>v*(DASH_CHART_META[key].unit==='%'?100:1)),borderColor:label==='Objetivo'?'#0cc0df':'#ff3131',borderWidth:label==='Objetivo'?2:1.5,borderDash:dash,pointRadius:0,fill:false};return [make(c.min,'Min',[6,4]),make(c.target,'Objetivo',[3,3]),make(c.max,'Max',[6,4])].filter(Boolean);}

const PROD_KPI_META={
  prod_oee:{label:'OEE',unit:'%',formula:'OEE = Availability × Performance × Quality'},
  prod_availability:{label:'Availability',unit:'%',formula:'Availability = Operating Time ÷ Planned Production Time'},
  prod_performance:{label:'Performance',unit:'%',formula:'Performance = Ideal Cycle Time × Production ÷ Operating Time'},
  prod_quality:{label:'Quality',unit:'%',formula:'Quality = Good Pieces ÷ Production Pieces'},
  prod_production:{label:'Production',unit:'pieces',formula:'Production = Total production quantity recorded'},
  prod_good:{label:'Good Pieces',unit:'pieces',formula:'Good Pieces = Production − Scrap'}
};
const PROD_CHART_META={
  prod_oee:{label:'OEE Trend',unit:'%'},
  prod_output:{label:'Production vs Good vs Scrap',unit:'pieces'},
  prod_machine:{label:'Production by Machine',unit:'pieces'},
  prod_shift:{label:'Production by Shift',unit:'pieces'},
  prod_cycle:{label:'Ideal vs Actual Cycle Time',unit:'seconds'},
};
Object.assign(DASH_KPI_META,PROD_KPI_META,Object.fromEntries(Object.entries(PROD_KPI_META).map(([k,v])=>[k,v])));
Object.assign(DASH_CHART_META,PROD_CHART_META,Object.fromEntries(Object.entries(PROD_CHART_META).map(([k,v])=>[k,v])));
const QUALITY_KPI_META={
  quality_scrap_pct:{label:'Scrap %',unit:'%',formula:'Scrap % = Total Scrap Pieces ÷ Total Production Pieces'},
  quality_ppm:{label:'PPMs',unit:'PPM',formula:'PPM = Total Scrap Pieces ÷ Total Production Pieces × 1,000,000'},
  quality_scrap_qty:{label:'Scrap Quantity',unit:'pieces',formula:'Scrap Quantity = Sum of all scrap event quantities'},
  quality_scrap_cost:{label:'Scrap Cost',unit:'currency',formula:'Scrap Cost = Scrap Quantity × Part Number Scrap Cost'},
  quality_copq:{label:'COPQ %',unit:'%',formula:'COPQ % = Poor Quality Cost ÷ Total Produced Cost'},
  quality_yield:{label:'Yield',unit:'%',formula:'Yield = Good Pieces ÷ Total Production Pieces'}
};
const QUALITY_CHART_META={
  quality_defect:{label:'Scrap by Defect',unit:'pieces'},
  quality_part:{label:'Scrap by Part Number',unit:'pieces'},
  quality_defect_pareto:{label:'Pareto by Defect',unit:'pieces'},
  quality_part_pareto:{label:'Pareto by Part Number',unit:'pieces'}
};
Object.assign(DASH_KPI_META,QUALITY_KPI_META,Object.fromEntries(Object.entries(QUALITY_KPI_META).map(([k,v])=>[k,v])));
Object.assign(DASH_CHART_META,QUALITY_CHART_META,Object.fromEntries(Object.entries(QUALITY_CHART_META).map(([k,v])=>[k,v])));
const DOWNTIME_KPI_META={
  downtime_total:{label:'Total Downtime',unit:'minutes',formula:'Total Downtime = Planned Downtime + Unplanned Downtime'},
  downtime_unplanned:{label:'Unplanned Downtime',unit:'minutes',formula:'Unplanned Downtime = Sum of downtime_events.minutes where event_type = Unplanned'},
  downtime_planned:{label:'Planned Downtime',unit:'minutes',formula:'Planned Downtime = Sum of downtime_events.minutes where event_type = Planned'},
  downtime_rate:{label:'Downtime Rate',unit:'%',formula:'Downtime Rate = Unplanned Downtime ÷ Planned Production Time'},
  downtime_events:{label:'Downtime Events',unit:'events',formula:'Downtime Events = Count of downtime_events'}
};
const DOWNTIME_CHART_META={
  downtime_trend:{label:'Downtime Trend',unit:'minutes'},
  downtime_type:{label:'Planned vs Unplanned',unit:'minutes'},
  downtime_machine:{label:'Downtime by Machine',unit:'minutes'},
  downtime_reason:{label:'Downtime by Reason',unit:'minutes'},
  downtime_category:{label:'Downtime by Category',unit:'minutes'}
};
Object.assign(DASH_KPI_META,DOWNTIME_KPI_META,Object.fromEntries(Object.entries(DOWNTIME_KPI_META).map(([k,v])=>[k,v])));
Object.assign(DASH_CHART_META,DOWNTIME_CHART_META,Object.fromEntries(Object.entries(DOWNTIME_CHART_META).map(([k,v])=>[k,v])));


function buildOeeMetrics(d){
  const groups=new Map();
  const add=(map,key,seed)=>{let x=map.get(key);if(!x){x={...seed};map.set(key,x);}return x;};
  for(const r of d.prod){
    const q=Number(r.production_quantity||0), sq=d.scrapByCapture.get(r.id)||0, gd=Math.max(0,q-sq);
    const dt=d.downByCapture.get(r.id)||{planned:0,unplanned:0,unknown:0,total:0};
    const sh=r.shifts, shiftSec=shiftDurationSeconds(sh), excluded=Number(sh?.excluded_planned_minutes||0)*60;
    const plannedSec=shiftSec==null?null:Math.max(0,shiftSec-excluded);
    const cycleKey=`${r.part_number_id||'unknown-part'}|${r.operation_id||'unknown-operation'}|${r.machine_id||'unknown-machine'}`;
    const configuredCycle=dashboardState.cycleTimes.find(x=>x.key===cycleKey);
    const fallbackCycle=Number(r.operations?.ideal_cycle_time_seconds||0);
    const cycle=Number(configuredCycle?.cycle_time_seconds||fallbackCycle||0);
    const hasCycle=Number.isFinite(cycle)&&cycle>0;
    const hasTiming=plannedSec!=null&&plannedSec>0;
    const dayKey=String(r.production_date||'').slice(0,10)||'No Date';
    const key=`${dayKey}|${r.shift_id||'unknown-shift'}|${r.machine_id||'unknown-machine'}`;
    const g=add(groups,key,{dayKey,shiftId:r.shift_id||'unknown-shift',machineId:r.machine_id||'unknown-machine',planned:0,unplanned:0,plannedDowntime:0,unknown:0,production:0,scrap:0,good:0,perfNumerator:0,missingCycleProduction:0,missingCycleCaptures:0,invalidTimingCaptures:0});
    if(g.planned===0&&hasTiming)g.planned=plannedSec;
    if(!hasTiming)g.invalidTimingCaptures++;
    g.unplanned+=dt.unplanned; g.plannedDowntime+=dt.planned; g.unknown+=dt.unknown;
    g.production+=q; g.scrap+=sq; g.good+=gd;
    if(hasCycle)g.perfNumerator+=cycle*q; else {g.missingCycleCaptures++;g.missingCycleProduction+=q;}
  }
  const calc=x=>{
    const operating=x.planned>0?Math.max(0,x.planned-(x.unplanned||0)*60):null;
    const availability=x.planned>0&&x.unknown===0?Math.min(1,operating/x.planned):null;
    const performanceRaw=operating>0&&x.production>0&&x.missingCycleProduction===0?x.perfNumerator/operating:null;
    const performance=performanceRaw==null?null:Math.min(1,Math.max(0,performanceRaw));
    const quality=x.production>0?Math.min(1,Math.max(0,x.good/x.production)):null;
    const oee=availability!=null&&performance!=null&&quality!=null?Math.min(1,Math.max(0,availability*performance*quality)):null;
    const actualCycle=x.production>0&&operating!=null?operating/x.production:null;
    const valid=x.planned>0&&x.unknown===0&&x.invalidTimingCaptures===0&&x.missingCycleProduction===0&&x.production>0;
    return {...x,operating,availability,performance,performanceRaw,quality,oee,actualCycle,valid};
  };
  const groupsCalc=[...groups.values()].map(calc);
  const daily=new Map(),machine=new Map(),shift=new Map();
  for(const g of groupsCalc){
    const addBreak=(map,key)=>{let x=map.get(key);if(!x){x={production:0,scrap:0,good:0,planned:0,operating:0,perfNumerator:0,unknown:0,unplanned:0,missingCycleProduction:0,missingCycleCaptures:0,invalidTimingCaptures:0,validGroups:0};map.set(key,x);}return x;};
    for(const [map,key] of [[daily,g.dayKey],[machine,g.machineId],[shift,g.shiftId]]){
      const x=addBreak(map,key);
      x.production+=g.production;x.scrap+=g.scrap;x.good+=g.good;x.planned+=g.planned;x.operating+=(g.operating||0);
      x.perfNumerator+=g.perfNumerator;x.unknown+=g.unknown;x.unplanned+=g.unplanned;
      x.missingCycleProduction+=g.missingCycleProduction;x.missingCycleCaptures+=g.missingCycleCaptures;x.invalidTimingCaptures+=g.invalidTimingCaptures;
      if(g.valid)x.validGroups++;
    }
  }
  const breakdownCalc=map=>new Map([...map.entries()].map(([k,x])=>[k,calc(x)]));
  const timingGroups=groupsCalc.filter(g=>g.planned>0);
  const total={
    production:groupsCalc.reduce((a,g)=>a+g.production,0),scrap:groupsCalc.reduce((a,g)=>a+g.scrap,0),good:groupsCalc.reduce((a,g)=>a+g.good,0),
    planned:timingGroups.reduce((a,g)=>a+g.planned,0),operating:timingGroups.reduce((a,g)=>a+(g.operating||0),0),unplanned:timingGroups.reduce((a,g)=>a+g.unplanned,0),
    perfNumerator:groupsCalc.reduce((a,g)=>a+g.perfNumerator,0),plannedDowntime:groupsCalc.reduce((a,g)=>a+g.plannedDowntime,0),unplannedDowntime:groupsCalc.reduce((a,g)=>a+g.unplanned,0),
    unknown:groupsCalc.reduce((a,g)=>a+g.unknown,0),missingCycleProduction:groupsCalc.reduce((a,g)=>a+g.missingCycleProduction,0),missingCycleCaptures:groupsCalc.reduce((a,g)=>a+g.missingCycleCaptures,0),invalidTimingCaptures:groupsCalc.reduce((a,g)=>a+g.invalidTimingCaptures,0),
    valid:groupsCalc.filter(g=>g.valid).length,invalid:groupsCalc.filter(g=>!g.valid).length
  };
  return {...total,...calc(total),daily:breakdownCalc(daily),machine:breakdownCalc(machine),shift:breakdownCalc(shift),groups:groupsCalc};
}
function prepareOeeData(d){
  const scrapByCapture=new Map(),downByCapture=new Map();
  for(const r of d.scrap)scrapByCapture.set(r.production_capture_id,(scrapByCapture.get(r.production_capture_id)||0)+Number(r.quantity||0));
  for(const r of d.downtime){const a=downByCapture.get(r.production_capture_id)||{planned:0,unplanned:0,unknown:0,total:0};const m=Number(r.minutes||0);a.total+=m;const type=String(r.event_type||'').trim().toLowerCase();if(type==='planned')a.planned+=m;else if(type==='unplanned')a.unplanned+=m;else a.unknown+=m;downByCapture.set(r.production_capture_id,a);}
  return {...d,scrapByCapture,downByCapture};
}
function productionDashboardAggregate(rangeOverride=null){
  const base=dashboardFiltered(rangeOverride),d=prepareOeeData(base),m=buildOeeMetrics(d);
  return {d,...m};
}
function productionDashboardComparison(){const p=dashboardPeriod(),currentRange=dashboardRange(),previousRange={from:p.compareFrom,to:p.compareTo};return {current:productionDashboardAggregate(currentRange),previous:productionDashboardAggregate(previousRange),period:p,currentRange,previousRange};}
function productionMetricLabel(id){return dashboardState.machines.find(x=>x.id===id)?.code||dashboardState.machines.find(x=>x.id===id)?.name||'Unknown Machine';}
function productionShiftLabel(id){const x=dashboardState.shifts.find(s=>s.id===id);return x?`${x.code} — ${x.name}`:'Unknown Shift';}
function prodDeltaMarkup(key,current,previous,higherIsBetter,label){return kpiDeltaMarkup(key,current,previous,higherIsBetter,label);}
function renderProductionDashboard(){
  const box=document.getElementById('dashboardProduction');if(!box)return;const cmp=productionDashboardComparison(),a=cmp.current,prev=cmp.previous,p=cmp.period;
  if(!a.d.prod.length){box.innerHTML='<div class="panel dashboard-empty"><div class="eyebrow">PRODUCTION</div><h2>No Data</h2><p>No production captures match the selected Dashboard filters.</p></div>';dashboardStatus('No Data in the selected filter scope.');return;}
  const warning=(a.invalid||a.unknown||a.missingCycleProduction>0||a.invalidTimingCaptures>0)?`<div class="notice dashboard-data-note">${a.unknown?`${a.unknown} downtime event(s) have an unknown classification. `:''}${a.missingCycleProduction>0?`${a.missingCycleProduction.toLocaleString()} production piece(s) belong to captures without a valid ideal cycle time; Performance and OEE are N/A until the operation cycle time is completed. `:''}${a.invalidTimingCaptures>0?`${a.invalidTimingCaptures} capture(s) have incomplete shift timing and cannot contribute to Availability. `:''}</div>`:'';
  box.innerHTML=`${warning}<div class="dashboard-overview-head"><div><div class="eyebrow">PRODUCTION OVERVIEW</div><h2>${escapeHtml(p.label)}</h2><p>${p.from} → ${p.to} · Compared with ${p.compareFrom} → ${p.compareTo}</p></div><div class="dashboard-live-badge"><span></span>Production intelligence</div></div>
  <div class="grid dashboard-kpis production-kpis">
    <div class="card kpi-card prod-kpi-oee"><div class="kpi-top"><div class="label">OEE</div>${kpiGear('prod_oee')}</div><div class="metric">${dashPct(a.oee)}</div>${prodDeltaMarkup('prod_oee',a.oee,prev.oee,true,'Previous Period')}</div>
    <div class="card kpi-card prod-kpi-availability"><div class="kpi-top"><div class="label">Availability</div>${kpiGear('prod_availability')}</div><div class="metric">${dashPct(a.availability)}</div>${prodDeltaMarkup('prod_availability',a.availability,prev.availability,true,'Previous Period')}</div>
    <div class="card kpi-card prod-kpi-performance"><div class="kpi-top"><div class="label">Performance</div>${kpiGear('prod_performance')}</div><div class="metric">${dashPct(a.performance)}</div>${prodDeltaMarkup('prod_performance',a.performance,prev.performance,true,'Previous Period')}</div>
    <div class="card kpi-card prod-kpi-quality"><div class="kpi-top"><div class="label">Quality</div>${kpiGear('prod_quality')}</div><div class="metric">${dashPct(a.quality)}</div>${prodDeltaMarkup('prod_quality',a.quality,prev.quality,true,'Previous Period')}</div>
    <div class="card kpi-card prod-kpi-production"><div class="kpi-top"><div class="label">Production</div>${kpiGear('prod_production')}</div><div class="metric">${dashNum(a.production)}</div>${prodDeltaMarkup('prod_production',a.production,prev.production,true,'Previous Period')}</div>
    <div class="card kpi-card prod-kpi-good"><div class="kpi-top"><div class="label">Good Pieces</div>${kpiGear('prod_good')}</div><div class="metric">${dashNum(a.good)}</div>${prodDeltaMarkup('prod_good',a.good,prev.good,true,'Previous Period')}</div>
  </div>
  <div class="dashboard-chart-grid production-chart-grid">
    <div class="panel chart-panel chart-wide"><div class="chart-head"><div><h2>OEE Trend</h2><p>Daily OEE across the selected production scope.</p></div>${chartGear('prod_oee')}<span class="chart-chip">%</span></div><div class="chart-wrap"><canvas id="prodChartOee"></canvas></div></div>
    <div class="panel chart-panel chart-wide"><div class="chart-head"><div><h2>Production vs Good vs Scrap</h2><p>Daily output composition.</p></div>${chartGear('prod_output')}<span class="chart-chip">Pieces</span></div><div class="chart-wrap"><canvas id="prodChartOutput"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Production by Machine</h2><p>Output by machine.</p></div>${chartGear('prod_machine')}<span class="chart-chip">Pieces</span></div><div class="chart-wrap"><canvas id="prodChartMachine"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Production by Shift</h2><p>Output by shift.</p></div>${chartGear('prod_shift')}<span class="chart-chip">Pieces</span></div><div class="chart-wrap"><canvas id="prodChartShift"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Ideal vs Actual Cycle Time</h2><p>Calculated actual cycle time from operating time and output.</p></div>${chartGear('prod_cycle')}<span class="chart-chip">Seconds</span></div><div class="chart-wrap"><canvas id="prodChartCycle"></canvas></div></div>
  </div>`;
  dashboardStatus(`${a.d.prod.length.toLocaleString()} production captures · ${a.production.toLocaleString()} pieces produced.`);updateDashboardPeriodHint(p);renderProductionCharts(cmp);
}
function renderProductionCharts(cmp){if(!window.Chart){dashboardStatus('Chart library unavailable.','error');return;}const labels=[...cmp.current.daily.keys()].sort(),days=labels.map(k=>cmp.current.daily.get(k)),oee=days.map(x=>x.oee==null?null:x.oee*100),prod=days.map(x=>x.production),good=days.map(x=>x.good),scrap=days.map(x=>x.scrap);const yPct=k=>{const c=dashboardPrefs().charts?.[k]||{},o={beginAtZero:true,ticks:{callback:v=>v+'%'}};if(c.min!=null)o.min=c.min*100;if(c.max!=null)o.max=c.max*100;return o;};const refs=k=>chartReferenceDatasets(k,labels);const line=(key,id,data,extra={})=>chartCreate(key,document.getElementById(id),{type:'line',data:{labels,datasets:[{label:DASH_CHART_META[key].label,data,borderWidth:3,pointRadius:4,pointHoverRadius:7,tension:.3,fill:true,backgroundColor:'rgba(12,192,223,.10)',borderColor:'#0cc0df',pointBackgroundColor:'#fff',pointBorderWidth:2},...refs(key)]},options:chartBase({y:extra.pct?yPct(key):{beginAtZero:true,...extra}})});
  line('prod_oee','prodChartOee',oee,{pct:true});
  chartCreate('prod_output',document.getElementById('prodChartOutput'),{type:'bar',data:{labels,datasets:[{label:'Production',data:prod,backgroundColor:'rgba(12,192,223,.72)',borderColor:'#0cc0df',borderWidth:1},{label:'Good',data:good,backgroundColor:'rgba(0,103,50,.62)',borderColor:'#006732',borderWidth:1},{label:'Scrap',data:scrap,backgroundColor:'rgba(255,49,49,.72)',borderColor:'#ff3131',borderWidth:1},...refs('prod_output')]},options:chartBase({y:{beginAtZero:true}})});
  const machineEntries=[...cmp.current.machine.entries()].sort((a,b)=>b[1].production-a[1].production);const machineLabels=machineEntries.map(([id])=>productionMetricLabel(id)),machineVals=machineEntries.map(([,v])=>v.production);chartCreate('prod_machine',document.getElementById('prodChartMachine'),{type:'bar',data:{labels:machineLabels,datasets:[{label:'Production',data:machineVals,backgroundColor:'rgba(12,192,223,.72)',borderColor:'#0cc0df',borderWidth:1},...chartReferenceDatasets('prod_machine',machineLabels)]},options:{...chartBase({y:{beginAtZero:true}}),indexAxis:'y'}});
  const shiftEntries=[...cmp.current.shift.entries()].sort((a,b)=>b[1].production-a[1].production);const shiftLabels=shiftEntries.map(([id])=>productionShiftLabel(id)),shiftVals=shiftEntries.map(([,v])=>v.production);chartCreate('prod_shift',document.getElementById('prodChartShift'),{type:'bar',data:{labels:shiftLabels,datasets:[{label:'Production',data:shiftVals,backgroundColor:'rgba(20,57,128,.72)',borderColor:'#143980',borderWidth:1},...chartReferenceDatasets('prod_shift',shiftLabels)]},options:chartBase({y:{beginAtZero:true}})});
  const cycleEntries=machineEntries;const cycleLabels=cycleEntries.map(([id])=>productionMetricLabel(id)),idealVals=cycleEntries.map(([id,v])=>{const src=cmp.current.d.prod.filter(r=>(r.machine_id||'unknown-machine')===id);let num=0,den=0;for(const r of src){const q=Number(r.production_quantity||0),key=`${r.part_number_id||'unknown-part'}|${r.operation_id||'unknown-operation'}|${r.machine_id||'unknown-machine'}`,cfg=dashboardState.cycleTimes.find(x=>x.key===key),cy=Number(cfg?.cycle_time_seconds||r.operations?.ideal_cycle_time_seconds||0);if(Number.isFinite(cy)&&cy>0){num+=cy*q;den+=q;}}return den?num/den:null;}),actualVals=cycleEntries.map(([,v])=>v.actualCycle);chartCreate('prod_cycle',document.getElementById('prodChartCycle'),{type:'bar',data:{labels:cycleLabels,datasets:[{label:'Ideal',data:idealVals,backgroundColor:'rgba(12,192,223,.35)',borderColor:'#0cc0df',borderWidth:1},{label:'Actual',data:actualVals,backgroundColor:'rgba(255,49,49,.45)',borderColor:'#ff3131',borderWidth:1},...chartReferenceDatasets('prod_cycle',cycleLabels)]},options:chartBase({y:{beginAtZero:true}})});
  bindDashboardConfig();
  [['prod_oee',cmp.current.oee,'.prod-kpi-oee .metric'],['prod_availability',cmp.current.availability,'.prod-kpi-availability .metric'],['prod_performance',cmp.current.performance,'.prod-kpi-performance .metric'],['prod_quality',cmp.current.quality,'.prod-kpi-quality .metric'],['prod_production',cmp.current.production,'.prod-kpi-production .metric'],['prod_good',cmp.current.good,'.prod-kpi-good .metric']].forEach(([k,v,sel])=>document.querySelectorAll(sel).forEach(e=>{const c=kpiColorFor(k,v);e.style.color=c||'';}));
}


function downtimeAggregate(rangeOverride=null){
  const base=dashboardFiltered(rangeOverride), prodByCapture=new Map(base.prod.map(r=>[r.id,r]));
  let total=0,planned=0,unplanned=0,unknown=0,events=0,plannedProductionSeconds=0;
  const byMachine=new Map(),byReason=new Map(),byCategory=new Map(),byDay=new Map();
  const add=(map,key,label)=>{let x=map.get(key);if(!x){x={key,label,minutes:0,events:0};map.set(key,x);}return x;};
  const normalizeType=v=>String(v||'').trim().toLowerCase();
  for(const e of base.downtime){
    const mins=Math.max(0,Number(e.minutes||0)); events++; total+=mins;
    const t=normalizeType(e.event_type);
    if(t==='unplanned') unplanned+=mins; else if(t==='planned') planned+=mins; else unknown++;
    const parent=prodByCapture.get(e.production_capture_id);
    const machineId=parent?.machine_id||'unknown-machine';
    const machineLabel=dashboardState.machines.find(x=>x.id===machineId)?.code||'Unknown Machine';
    add(byMachine,machineId,machineLabel).minutes+=mins; add(byMachine,machineId,machineLabel).events++;
    const reasonLabel=(e.downtime_catalog?.downtime||e.reason||'Unknown Downtime').trim()||'Unknown Downtime';
    const reasonKey=e.downtime_catalog_id||`reason:${reasonLabel}`; add(byReason,reasonKey,reasonLabel).minutes+=mins; add(byReason,reasonKey,reasonLabel).events++;
    const categoryLabel=(e.downtime_catalog?.category||'Unknown Category').trim()||'Unknown Category';
    const categoryKey=`${e.downtime_catalog_id||reasonKey}|${categoryLabel}`; add(byCategory,categoryKey,categoryLabel).minutes+=mins; add(byCategory,categoryKey,categoryLabel).events++;
    const day=String(parent?.production_date||e.created_at||'').slice(0,10)||'No Date'; add(byDay,day,day).minutes+=mins; add(byDay,day,day).events++;
  }
  const timingGroups=new Map();
  for(const r of base.prod){
    const sh=r.shifts, dur=shiftDurationSeconds(sh), excluded=Number(sh?.excluded_planned_minutes||0)*60, plannedSec=dur==null?null:Math.max(0,dur-excluded);
    const key=`${String(r.production_date||'').slice(0,10)}|${r.shift_id||'unknown-shift'}|${r.machine_id||'unknown-machine'}`;
    if(!timingGroups.has(key)&&plannedSec!=null&&plannedSec>0)timingGroups.set(key,plannedSec);
  }
  plannedProductionSeconds=[...timingGroups.values()].reduce((a,b)=>a+b,0);
  const rate=plannedProductionSeconds>0?unplanned/(plannedProductionSeconds/60):null;
  return {d:base,total,planned,unplanned,unknown,events,plannedProductionSeconds,downtimeRate:rate,byMachine,byReason,byCategory,byDay};
}
function downtimeComparison(){const p=dashboardPeriod();return {current:downtimeAggregate(dashboardRange()),previous:downtimeAggregate({from:p.compareFrom,to:p.compareTo}),period:p};}
function downtimeDeltaMarkup(key,current,previous,label){return kpiDeltaMarkup(key,current,previous,false,label);}
function renderDowntimeDashboard(){
  const box=document.getElementById('dashboardDowntime');if(!box)return;const cmp=downtimeComparison(),a=cmp.current,prev=cmp.previous,p=cmp.period;
  if(!a.d.prod.length){box.innerHTML='<div class="panel dashboard-empty"><div class="eyebrow">DOWNTIME</div><h2>No Data</h2><p>No production captures match the selected Dashboard filters.</p></div>';dashboardStatus('No Data in the selected filter scope.');return;}
  const warnings=[];if(a.unknown)warnings.push(`${a.unknown} downtime event(s) have an unknown classification and are not counted as Planned or Unplanned.`);if(a.downtimeRate==null&&a.events)warnings.push('Downtime Rate is N/A because Planned Production Time is unavailable for the selected scope.');
  const warning=warnings.length?`<div class="notice dashboard-data-note">${escapeHtml(warnings.join(' '))}</div>`:'';
  const rows=[...a.byReason.values()].sort((x,y)=>y.minutes-x.minutes).slice(0,5);const max=Math.max(...rows.map(x=>x.minutes),1);
  const top=`<div class="downtime-top-loss panel"><div class="section-title"><div><div class="eyebrow">LOSS ANALYSIS</div><h2>Top Downtime Contributors</h2><p>Highest downtime causes in the selected scope.</p></div><span class="chart-chip">Minutes</span></div>${rows.length?rows.map((r,i)=>`<div class="downtime-loss-row"><div class="downtime-loss-rank">${String(i+1).padStart(2,'0')}</div><div class="downtime-loss-main"><div class="downtime-loss-meta"><strong>${escapeHtml(r.label)}</strong><span>${dashNum(r.minutes)} min · ${r.events} event${r.events===1?'':'s'}</span></div><div class="downtime-loss-track"><i style="width:${Math.max(3,(r.minutes/max)*100)}%"></i></div></div></div>`).join(''):'<div class="dashboard-mini-empty">No downtime data available.</div>'}</div>`;
  box.innerHTML=`${warning}<div class="dashboard-overview-head"><div><div class="eyebrow">DOWNTIME OVERVIEW</div><h2>${escapeHtml(p.label)}</h2><p>${p.from} → ${p.to} · Compared with ${p.compareFrom} → ${p.compareTo}</p></div><div class="dashboard-live-badge"><span></span>Downtime intelligence</div></div>
  <div class="grid dashboard-kpis downtime-kpis">
    <div class="card kpi-card downtime-kpi-total"><div class="kpi-top"><div class="label">Total Downtime</div>${kpiGear('downtime_total')}</div><div class="metric">${dashNum(a.total)}</div>${downtimeDeltaMarkup('downtime_total',a.total,prev.total,'Previous Period')}</div>
    <div class="card kpi-card downtime-kpi-unplanned"><div class="kpi-top"><div class="label">Unplanned Downtime</div>${kpiGear('downtime_unplanned')}</div><div class="metric">${dashNum(a.unplanned)}</div>${downtimeDeltaMarkup('downtime_unplanned',a.unplanned,prev.unplanned,'Previous Period')}</div>
    <div class="card kpi-card downtime-kpi-planned"><div class="kpi-top"><div class="label">Planned Downtime</div>${kpiGear('downtime_planned')}</div><div class="metric">${dashNum(a.planned)}</div>${downtimeDeltaMarkup('downtime_planned',a.planned,prev.planned,'Previous Period')}</div>
    <div class="card kpi-card downtime-kpi-rate"><div class="kpi-top"><div class="label">Downtime Rate</div>${kpiGear('downtime_rate')}</div><div class="metric">${dashPct(a.downtimeRate)}</div>${downtimeDeltaMarkup('downtime_rate',a.downtimeRate,prev.downtimeRate,'Previous Period')}</div>
    <div class="card kpi-card downtime-kpi-events"><div class="kpi-top"><div class="label">Downtime Events</div>${kpiGear('downtime_events')}</div><div class="metric">${dashNum(a.events)}</div>${downtimeDeltaMarkup('downtime_events',a.events,prev.events,'Previous Period')}</div>
  </div>
  <div class="dashboard-chart-grid downtime-chart-grid">
    <div class="panel chart-panel chart-wide"><div class="chart-head"><div><h2>Downtime Trend</h2><p>Daily total downtime across the selected scope.</p></div>${chartGear('downtime_trend')}<span class="chart-chip">Minutes</span></div><div class="chart-wrap"><canvas id="dtChartTrend"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Planned vs Unplanned</h2><p>Downtime classification mix.</p></div>${chartGear('downtime_type')}<span class="chart-chip">Minutes</span></div><div class="chart-wrap"><canvas id="dtChartType"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Downtime by Machine</h2><p>Total downtime by machine.</p></div>${chartGear('downtime_machine')}<span class="chart-chip">Minutes</span></div><div class="chart-wrap"><canvas id="dtChartMachine"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Downtime by Reason</h2><p>Largest downtime causes.</p></div>${chartGear('downtime_reason')}<span class="chart-chip">Minutes</span></div><div class="chart-wrap"><canvas id="dtChartReason"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Downtime by Category</h2><p>Loss concentration by category.</p></div>${chartGear('downtime_category')}<span class="chart-chip">Minutes</span></div><div class="chart-wrap"><canvas id="dtChartCategory"></canvas></div></div>
  </div>${top}`;
  dashboardStatus(`${a.d.prod.length.toLocaleString()} production captures · ${a.events.toLocaleString()} downtime events · ${dashNum(a.total)} minutes downtime.`);updateDashboardPeriodHint(p);renderDowntimeCharts(cmp);
}
function renderDowntimeCharts(cmp){
  if(!window.Chart){dashboardStatus('Chart library unavailable.','error');return;}
  const labels=[...cmp.current.byDay.keys()].sort(),vals=labels.map(k=>cmp.current.byDay.get(k)?.minutes||0),refs=k=>chartReferenceDatasets(k,labels);
  chartCreate('downtime_trend',document.getElementById('dtChartTrend'),{type:'line',data:{labels,datasets:[{label:'Downtime',data:vals,borderWidth:3,pointRadius:4,pointHoverRadius:7,tension:.3,fill:true,backgroundColor:'rgba(255,49,49,.10)',borderColor:'#ff3131',pointBackgroundColor:'#fff',pointBorderWidth:2}]},options:chartBase({y:{beginAtZero:true,...(function(){const c=dashboardPrefs().charts?.downtime_trend||{},o={};if(c.min!=null)o.min=c.min;if(c.max!=null)o.max=c.max;return o;})()}})});
  const typeLabels=['Unplanned','Planned'],typeVals=[cmp.current.unplanned,cmp.current.planned];chartCreate('downtime_type',document.getElementById('dtChartType'),{type:'doughnut',data:{labels:typeLabels,datasets:[{data:typeVals,backgroundColor:['#ff3131','#0cc0df'],borderColor:'#fff',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.label}: ${dashNum(c.raw)} min`}}}}});
  const renderBar=(key,id,entries,horizontal=true)=>{const sorted=[...entries].filter(([,v])=>v.minutes>0).sort((a,b)=>b[1].minutes-a[1].minutes).slice(0,10),ls=sorted.map(([,v])=>v.label),vs=sorted.map(([,v])=>v.minutes);chartCreate(key,document.getElementById(id),{type:'bar',data:{labels:ls,datasets:[{label:'Downtime',data:vs,backgroundColor:'rgba(255,49,49,.72)',borderColor:'#ff3131',borderWidth:1},...chartReferenceDatasets(key,ls)]},options:{...chartBase({y:{beginAtZero:true}}),indexAxis:horizontal?'y':'x'}});};
  renderBar('downtime_machine','dtChartMachine',cmp.current.byMachine.entries());renderBar('downtime_reason','dtChartReason',cmp.current.byReason.entries());renderBar('downtime_category','dtChartCategory',cmp.current.byCategory.entries());bindDashboardConfig();
  [['downtime_total',cmp.current.total,'.downtime-kpi-total .metric'],['downtime_unplanned',cmp.current.unplanned,'.downtime-kpi-unplanned .metric'],['downtime_planned',cmp.current.planned,'.downtime-kpi-planned .metric'],['downtime_rate',cmp.current.downtimeRate,'.downtime-kpi-rate .metric'],['downtime_events',cmp.current.events,'.downtime-kpi-events .metric']].forEach(([k,v,sel])=>document.querySelectorAll(sel).forEach(e=>{const c=kpiColorFor(k,v);e.style.color=c||'';}));
}

function qualityAggregate(rangeOverride=null){
  const base=dashboardFiltered(rangeOverride), prod=base.prod;
  const scrapRows=base.scrap||[];
  const scrapByCapture=new Map();
  for(const e of scrapRows)scrapByCapture.set(e.production_capture_id,(scrapByCapture.get(e.production_capture_id)||0)+Number(e.quantity||0));
  const prodByCapture=new Map(prod.map(r=>[r.id,r]));
  let production=0,scrap=0,scrapCost=0,goodCost=0,poorCost=0;
  const byPart=new Map(),byDefect=new Map(),byPartDefect=new Map();
  const partName=id=>dashboardState.parts.find(x=>x.id===id)?.part_number||'Unknown Part Number';
  const add=(map,key,label)=>{let x=map.get(key);if(!x){x={id:key,label,quantity:0,cost:0};map.set(key,x);}return x;};
  for(const r of prod){
    const q=Number(r.production_quantity||0); production+=q;
    const pieceCost=Number(r.part_numbers?.piece_cost||0), scrapUnitCost=Number(r.part_numbers?.scrap_cost||0);
    const sq=scrapByCapture.get(r.id)||0; scrap+=sq;
    const good=Math.max(0,q-sq), badCost=sq*scrapUnitCost;
    goodCost+=good*pieceCost; poorCost+=badCost; scrapCost+=badCost;
    const pn=partName(r.part_number_id), ps=add(byPart,r.part_number_id,pn); ps.quantity+=sq; ps.cost+=badCost;
  }
  for(const x of scrapRows){
    const cat=x.scrap_catalog||{}, defect=cat.defect||'Unknown Defect';
    const parent=prodByCapture.get(x.production_capture_id);
    const partId=parent?.part_number_id||'unknown-part';
    const pn=parent?partName(parent.part_number_id):'Unknown Part Number';
    const defectKey=cat.code||defect;
    const d=add(byDefect,defectKey,defect);d.quantity+=Number(x.quantity||0);
    const partDefectKey=`${partId}|${defectKey}`;
    const pd=byPartDefect.get(partDefectKey)||{partId,label:pn,defect,defectKey,quantity:0};pd.quantity+=Number(x.quantity||0);byPartDefect.set(partDefectKey,pd);
  }
  const good=production-scrap,yieldRatio=production>0?good/production:null,scrapPct=production>0?scrap/production:null,ppm=production>0?scrap/production*1e6:null,totalProducedCost=goodCost+poorCost,copqPct=totalProducedCost>0?poorCost/totalProducedCost:null;
  const topProducts=[...byPart.values()].filter(x=>x.quantity>0).sort((a,b)=>b.quantity-a.quantity).slice(0,3).map((item,i)=>({...item,rank:i+1,defects:[...byPartDefect.values()].filter(x=>x.partId===item.id).sort((a,b)=>b.quantity-a.quantity).slice(0,3)}));
  return {d:base,production,scrap,scrapCost,good,goodCost,poorCost,totalProducedCost,copqPct,yieldRatio,scrapPct,ppm,byPart,byDefect,byPartDefect,topProducts};
}
function qualityComparison(){const p=dashboardPeriod();return {current:qualityAggregate(dashboardRange()),previous:qualityAggregate({from:p.compareFrom,to:p.compareTo}),period:p};}
function qualityDeltaMarkup(key,current,previous,higherIsBetter,label){return kpiDeltaMarkup(key,current,previous,higherIsBetter,label);}
function renderQualityDashboard(){
  const box=document.getElementById('dashboardQuality');if(!box)return;const cmp=qualityComparison(),a=cmp.current,prev=cmp.previous,p=cmp.period;
  if(!a.d.prod.length){box.innerHTML='<div class="panel dashboard-empty"><div class="eyebrow">QUALITY</div><h2>No Data</h2><p>No production captures match the selected Dashboard filters.</p></div>';dashboardStatus('No Data in the selected filter scope.');return;}
  const unknownCatalog=a.d.scrap.filter(x=>!x.scrap_catalog).length;
  const warning=unknownCatalog?`<div class="notice dashboard-data-note">Data quality: ${unknownCatalog} scrap event(s) do not have a resolved Scrap Catalog record. Their quantities remain included in Scrap, PPM and cost calculations, but their defect analysis is shown as Unknown.</div>`:'';
  const top3a=Array.from({length:3},(_,idx)=>{const item=a.topProducts[idx],rank=idx+1;if(!item)return `<article class="quality-top3-card quality-top3-na"><div class="quality-top3-head"><div class="quality-rank-badge">${rank}</div><div class="quality-rank-copy"><div class="quality-top3-label">RANK ${rank}</div></div></div><div class="quality-top3-na-text">Not Applicable</div></article>`;const pct=a.scrap>0?(item.quantity/a.scrap)*100:0;const maxDef=item.defects[0]?.quantity||1;return `<article class="quality-top3-card"><div class="quality-top3-head"><div class="quality-rank-badge">${rank}</div><div class="quality-rank-copy"><div class="quality-top3-label">RANK ${rank}</div></div><div class="quality-top3-share"><strong>${pct.toFixed(1)}%</strong><span>of total scrap</span></div></div><div class="quality-top3-main"><div><div class="quality-top3-label">Part Number</div><h3>${escapeHtml(item.label)}</h3></div><div class="quality-top3-scrap"><strong>${dashNum(item.quantity)}</strong><span>Scrap Pieces</span></div></div><div class="quality-top3-defects"><div class="quality-top3-label">Top 3 Defects</div>${item.defects.length?item.defects.map((d,i)=>{const w=Math.max(6,Math.min(100,(d.quantity/maxDef)*100));return `<div class="quality-defect-row"><div class="quality-defect-meta"><span class="quality-defect-rank">${String(i+1).padStart(2,'0')}</span><span class="quality-defect-name">${escapeHtml(d.defect)}</span><strong>${dashNum(d.quantity)}</strong></div><div class="quality-defect-track"><i style="width:${w}%"></i></div></div>`}).join(''):'<div class="quality-top3-empty">No classified scrap defects.</div>'}</div></article>`;}).join('');
  box.innerHTML=`${warning}<div class="dashboard-overview-head"><div><div class="eyebrow">QUALITY OVERVIEW</div><h2>${escapeHtml(p.label)}</h2><p>${p.from} → ${p.to} · Compared with ${p.compareFrom} → ${p.compareTo}</p></div><div class="dashboard-live-badge"><span></span>Quality intelligence</div></div>
  <div class="grid dashboard-kpis quality-kpis">
    <div class="card kpi-card quality-kpi-scrap"><div class="kpi-top"><div class="label">Scrap %</div>${kpiGear('quality_scrap_pct')}</div><div class="metric">${dashPct(a.scrapPct)}</div>${qualityDeltaMarkup('quality_scrap_pct',a.scrapPct,prev.scrapPct,false,'Previous Period')}</div>
    <div class="card kpi-card quality-kpi-ppm"><div class="kpi-top"><div class="label">PPMs</div>${kpiGear('quality_ppm')}</div><div class="metric">${dashNum(a.ppm)}</div>${qualityDeltaMarkup('quality_ppm',a.ppm,prev.ppm,false,'Previous Period')}</div>
    <div class="card kpi-card"><div class="kpi-top"><div class="label">Scrap Quantity</div>${kpiGear('quality_scrap_qty')}</div><div class="metric">${dashNum(a.scrap)}</div>${qualityDeltaMarkup('quality_scrap_qty',a.scrap,prev.scrap,false,'Previous Period')}</div>
    <div class="card kpi-card quality-kpi-cost"><div class="kpi-top"><div class="label">Scrap Cost</div>${kpiGear('quality_scrap_cost')}</div><div class="metric">${dashMoney(a.scrapCost)}</div>${qualityDeltaMarkup('quality_scrap_cost',a.scrapCost,prev.scrapCost,false,'Previous Period')}</div>
    <div class="card kpi-card quality-kpi-copq"><div class="kpi-top"><div class="label">COPQ %</div>${kpiGear('quality_copq')}</div><div class="metric">${dashPct(a.copqPct)}</div>${qualityDeltaMarkup('quality_copq',a.copqPct,prev.copqPct,false,'Previous Period')}</div>
    <div class="card kpi-card quality-kpi-yield"><div class="kpi-top"><div class="label">Yield</div>${kpiGear('quality_yield')}</div><div class="metric">${dashPct(a.yieldRatio)}</div>${qualityDeltaMarkup('quality_yield',a.yieldRatio,prev.yieldRatio,true,'Previous Period')}</div>
  </div>
  <div class="quality-top3-section"><div class="quality-top3-grid">${top3a}</div></div>
  <div class="dashboard-chart-grid quality-chart-grid">
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Scrap by Defect</h2><p>Scrap quantity by defect.</p></div>${chartGear('quality_defect')}<span class="chart-chip">Pieces</span></div><div class="chart-wrap"><canvas id="qualityChartDefect"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Scrap by Part Number</h2><p>Scrap quantity by Part Number.</p></div>${chartGear('quality_part')}<span class="chart-chip">Pieces</span></div><div class="chart-wrap"><canvas id="qualityChartPart"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Pareto by Defect</h2><p>Defects ranked from highest to lowest scrap.</p></div>${chartGear('quality_defect_pareto')}<span class="chart-chip">Pieces</span></div><div class="chart-wrap"><canvas id="qualityChartDefectPareto"></canvas></div></div>
    <div class="panel chart-panel"><div class="chart-head"><div><h2>Pareto by Part Number</h2><p>Part Numbers ranked from highest to lowest scrap.</p></div>${chartGear('quality_part_pareto')}<span class="chart-chip">Pieces</span></div><div class="chart-wrap"><canvas id="qualityChartPartPareto"></canvas></div></div>
  </div>`;
  dashboardStatus(`${a.d.prod.length.toLocaleString()} production captures · ${a.scrap.toLocaleString()} scrap pieces.`);updateDashboardPeriodHint(p);renderQualityCharts(cmp);bindDashboardConfig();
}
function renderQualityCharts(cmp){
  if(!window.Chart){dashboardStatus('Chart library unavailable.','error');return;}
  const a=cmp.current;
  const pie=(key,id,map)=>{
    const es=[...map.values()].filter(x=>x.quantity>0).sort((x,y)=>y.quantity-x.quantity),labels=es.map(x=>x.label),vals=es.map(x=>x.quantity);
    const palette=['#0cc0df','#ff3131','#143980','#00a878','#f4b400','#7b61ff','#ef7d32','#21a179','#8c6bb1','#5b7083'];
    const bg=vals.map((_,i)=>palette[i%palette.length]);
    chartCreate(key,document.getElementById(id),{type:'doughnut',data:{labels,datasets:[{label:DASH_CHART_META[key].label,data:vals,backgroundColor:bg,borderWidth:3,borderColor:'#ffffff',hoverOffset:8}]},options:{...chartBase({}),cutout:'58%',plugins:{legend:{position:'right',labels:{boxWidth:12,padding:12,usePointStyle:true}},tooltip:{callbacks:{label:(ctx)=>{const total=ctx.dataset.data.reduce((s,v)=>s+v,0)||1;const pct=(ctx.raw/total*100);return ` ${ctx.label}: ${Number(ctx.raw).toLocaleString()} (${pct.toFixed(1)}%)`;}}}}}});
  };
  const pareto=(key,id,map)=>{
    const es=[...map.values()].filter(x=>x.quantity>0).sort((x,y)=>y.quantity-x.quantity),labels=es.map(x=>x.label),vals=es.map(x=>x.quantity);
    const total=vals.reduce((s,v)=>s+v,0)||1;let running=0;const cumulative=vals.map(v=>{running+=v;return +(running/total*100).toFixed(2);});
    chartCreate(key,document.getElementById(id),{type:'bar',data:{labels,datasets:[{type:'bar',label:'Scrap Pieces',data:vals,backgroundColor:'rgba(255,49,49,.72)',borderColor:'#ff3131',borderWidth:1,borderRadius:3,yAxisID:'y'},{type:'line',label:'Cumulative %',data:cumulative,borderColor:'#0cc0df',backgroundColor:'rgba(12,192,223,.10)',borderWidth:3,pointRadius:3,pointHoverRadius:5,tension:.25,fill:false,yAxisID:'yPct'}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:12,usePointStyle:true}},tooltip:{callbacks:{label:(ctx)=>ctx.dataset.yAxisID==='yPct'?` Cumulative: ${ctx.raw.toFixed(1)}%`:` Scrap: ${Number(ctx.raw).toLocaleString()} pieces`}}},scales:{x:{grid:{display:false},ticks:{maxRotation:35,minRotation:0}},y:{beginAtZero:true,grid:{display:false},title:{display:true,text:'Scrap Pieces'}},yPct:{beginAtZero:true,min:0,max:100,position:'right',grid:{drawOnChartArea:false},title:{display:true,text:'Cumulative %'},ticks:{callback:v=>v+'%'}}}}});
  };
  pie('quality_defect','qualityChartDefect',a.byDefect);
  pie('quality_part','qualityChartPart',a.byPart);
  pareto('quality_defect_pareto','qualityChartDefectPareto',a.byDefect);
  pareto('quality_part_pareto','qualityChartPartPareto',a.byPart);
  [['quality_scrap_pct',a.scrapPct,'.quality-kpi-scrap .metric'],['quality_ppm',a.ppm,'.quality-kpi-ppm .metric'],['quality_scrap_qty',a.scrap,'.quality-kpi-scrap-qty .metric'],['quality_scrap_cost',a.scrapCost,'.quality-kpi-cost .metric'],['quality_copq',a.copqPct,'.quality-kpi-copq .metric'],['quality_yield',a.yieldRatio,'.quality-kpi-yield .metric']].forEach(([k,v,sel])=>document.querySelectorAll(sel).forEach(e=>{const c=kpiColorFor(k,v);e.style.color=c||'';}));
}
function renderDashboardGeneral(){const box=document.getElementById('dashboardGeneral');if(!box)return;const cmp=dashboardComparison(),a=cmp.current,prev=cmp.previous,p=cmp.period;if(!a.d.prod.length){box.innerHTML='<div class="panel dashboard-empty"><div class="eyebrow">GENERAL</div><h2>No Data</h2><p>No production captures match the selected Dashboard filters.</p></div>';dashboardStatus('No Data in the selected filter scope.');return;}
 const warning=a.unknownEvents||a.invalidOee?`<div class="notice dashboard-data-note">Data quality: ${a.unknownEvents?`${a.unknownEvents} capture(s) contain unknown downtime classification. `:''}${a.invalidOee?`${a.invalidOee} capture(s) are not eligible for OEE because required timing, operation, cycle-time or downtime data is incomplete.`:''}</div>`:'';
 const priorLabel=p.period==='Today'?'Previous Day':p.period==='This Week'?'Previous Week':p.period==='This Month'?'Previous Month':p.period==='This Year'?'Previous Year':p.period==='Previous Day'?'Previous Day':p.period==='Previous Week'?'Previous Week':p.period==='Previous Month'?'Previous Month':'Previous Year';
 box.innerHTML=`${warning}<div class="dashboard-overview-head"><div><div class="eyebrow">GENERAL OVERVIEW</div><h2>${escapeHtml(p.label)}</h2><p>${p.from} → ${p.to} · Compared with ${p.compareFrom} → ${p.compareTo}</p></div><div class="dashboard-live-badge"><span></span>Live operational view</div></div>
 <div class="grid dashboard-kpis">
 <div class="card kpi-card kpi-oee"><div class="kpi-top"><div class="label">OEE</div>${kpiGear('oee')}</div><div class="metric kpi-value-oee">${dashPct(a.oee)}</div>${kpiDeltaMarkup('oee',a.oee,prev.oee,true,priorLabel)}</div>
 <div class="card kpi-card kpi-production"><div class="kpi-top"><div class="label">Production</div>${kpiGear('production')}</div><div class="metric kpi-value-production">${dashNum(a.production)}</div>${kpiDeltaMarkup('production',a.production,prev.production,true,priorLabel)}</div>
 <div class="card kpi-card kpi-scrap"><div class="kpi-top"><div class="label">Scrap</div>${kpiGear('scrap')}</div><div class="metric kpi-value-scrap">${dashPct(a.scrapPct)}</div>${kpiDeltaMarkup('scrap',a.scrapPct,prev.scrapPct,false,priorLabel)}</div>
 <div class="card kpi-card kpi-ppm"><div class="kpi-top"><div class="label">PPMs</div>${kpiGear('ppm')}</div><div class="metric kpi-value-ppm">${a.ppm==null?'N/A':Math.round(a.ppm).toLocaleString()}</div>${kpiDeltaMarkup('ppm',a.ppm,prev.ppm,false,priorLabel)}</div>
 <div class="card kpi-card kpi-yield"><div class="kpi-top"><div class="label">Yield</div>${kpiGear('yield')}</div><div class="metric kpi-value-yield">${dashPct(a.yieldRatio)}</div>${kpiDeltaMarkup('yield',a.yieldRatio,prev.yieldRatio,true,priorLabel)}</div>
 <div class="card kpi-card kpi-copq"><div class="kpi-top"><div class="label">COPQ</div>${kpiGear('copq')}</div><div class="metric kpi-value-copq">${dashPct(a.copqPct)}</div><div class="kpi-cost-sub">${dashMoney(a.scrapCost)} cost of poor quality</div>${kpiDeltaMarkup('copq',a.copqPct,prev.copqPct,false,priorLabel)}</div>
 </div>
 <div class="dashboard-chart-grid dashboard-chart-grid-six">
 <div class="panel chart-panel"><div class="chart-head"><div><h2>OEE</h2><p>Daily OEE.</p></div>${chartGear('oee')}<span class="chart-chip">%</span></div><div class="chart-wrap"><canvas id="chartOee"></canvas></div></div>
 <div class="panel chart-panel"><div class="chart-head"><div><h2>Production</h2><p>Daily pieces produced.</p></div>${chartGear('production')}<span class="chart-chip">Pieces</span></div><div class="chart-wrap"><canvas id="chartProduction"></canvas></div></div>
 <div class="panel chart-panel"><div class="chart-head"><div><h2>Scrap %</h2><p>Average scrap rate by part number.</p></div>${chartGear('scrap')}<span class="chart-chip">%</span></div><div class="chart-wrap"><canvas id="chartScrap"></canvas></div></div>
 <div class="panel chart-panel"><div class="chart-head"><div><h2>PPMs</h2><p>Scrap pieces per million produced.</p></div>${chartGear('ppm')}<span class="chart-chip">PPM</span></div><div class="chart-wrap"><canvas id="chartPpm"></canvas></div></div>
 <div class="panel chart-panel"><div class="chart-head"><div><h2>Yield</h2><p>Good pieces / production.</p></div>${chartGear('yield')}<span class="chart-chip">%</span></div><div class="chart-wrap"><canvas id="chartYield"></canvas></div></div>
 <div class="panel chart-panel"><div class="chart-head"><div><h2>COPQ %</h2><p>Poor quality cost / total produced cost.</p></div>${chartGear('copq')}<span class="chart-chip">%</span></div><div class="chart-wrap"><canvas id="chartCopq"></canvas></div></div>
 </div>`;
 dashboardStatus(`${a.d.prod.length.toLocaleString()} production captures · ${a.d.scrap.length.toLocaleString()} scrap events · ${a.d.downtime.length.toLocaleString()} downtime events.`);updateDashboardPeriodHint(p);renderDashboardCharts(cmp);}
function updateDashboardPeriodHint(p){const el=document.getElementById('dashboardPeriodHint');if(el)el.textContent=`Period: ${p.from} to ${p.to} · Previous comparison: ${p.compareFrom} to ${p.compareTo}`;}
function chartBase(yOptions={}){return {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},interaction:{mode:'index',intersect:false},scales:{x:{grid:{display:false},ticks:{maxRotation:0}},y:{beginAtZero:true,grid:{display:false},...yOptions}}};}
function dashboardDailyMetric(day){return dashboardAggregate({from:day,to:day});}
function renderDashboardCharts(cmp){if(!window.Chart){dashboardStatus('Chart library unavailable.','error');return;}const labels=niceLabels(cmp.current.daily),daily=labels.map(day=>dashboardDailyMetric(day)),prod=daily.map(x=>x.production),oee=daily.map(x=>x.oee==null?null:x.oee*100),yieldVals=daily.map(x=>x.yieldRatio==null?null:x.yieldRatio*100),ppmVals=daily.map(x=>x.ppm==null?null:x.ppm),scrapVals=daily.map(x=>x.scrapPct==null?null:x.scrapPct*100),copqVals=daily.map(x=>x.copqPct==null?null:x.copqPct*100);const refs=k=>chartReferenceDatasets(k,labels);const yOpts=(key,extra={})=>{const c=dashboardPrefs().charts?.[key]||{},pct=DASH_CHART_META[key].unit==='%',o={...extra};if(c.min!=null)o.min=pct?c.min*100:c.min;if(c.max!=null)o.max=pct?c.max*100:c.max;return o;};
const line=(key,id,label,data,extra={})=>chartCreate(key,document.getElementById(id),{type:'line',data:{labels,datasets:[{label,data,borderWidth:3,pointRadius:4,pointHoverRadius:7,tension:.3,fill:true,backgroundColor:key==='oee'||key==='yield'?'rgba(12,192,223,.12)':'rgba(255,49,49,.10)',borderColor:key==='oee'||key==='yield'?'#0cc0df':'#ff3131',pointBackgroundColor:'#fff',pointBorderWidth:2},...refs(key)]},options:chartBase({y:yOpts(key,extra)})});
line('oee','chartOee','OEE',oee,{beginAtZero:true,ticks:{callback:v=>v+'%'}});
chartCreate('production',document.getElementById('chartProduction'),{type:'bar',data:{labels,datasets:[{label:'Production',data:prod,borderRadius:3,backgroundColor:'rgba(12,192,223,.72)',borderColor:'#0cc0df',borderWidth:1},...refs('production')]},options:chartBase({y:yOpts('production')})});
line('scrap','chartScrap','Scrap %',scrapVals,{beginAtZero:true,ticks:{callback:v=>v+'%'}});
line('ppm','chartPpm','PPM',ppmVals,{});
line('yield','chartYield','Yield',yieldVals,{min:80,max:100,ticks:{callback:v=>v+'%'}});
line('copq','chartCopq','COPQ %',copqVals,{beginAtZero:true,ticks:{callback:v=>v+'%'}});
bindDashboardConfig();[['oee',cmp.current.oee,'.kpi-value-oee'],['production',cmp.current.production,'.kpi-value-production'],['scrap',cmp.current.scrapPct,'.kpi-value-scrap'],['ppm',cmp.current.ppm,'.kpi-value-ppm'],['yield',cmp.current.yieldRatio,'.kpi-value-yield'],['copq',cmp.current.copqPct,'.kpi-value-copq']].forEach(([k,v,sel])=>document.querySelectorAll(sel).forEach(e=>{const c=kpiColorFor(k,v);e.style.color=c||'';}));}

function renderTopParts(a){const el=document.getElementById('topParts');if(!el)return;const rows=[...a.partStats.entries()].map(([id,v])=>({id,...v,rate:v.production>0?v.scrap/v.production:0,name:dashboardState.parts.find(x=>x.id===id)?.part_number||'Unknown Part'})).sort((x,y)=>y.scrap-x.scrap).slice(0,5);if(!rows.length){el.innerHTML='<div class="dashboard-mini-empty">No part-number data available.</div>';return;}const max=Math.max(...rows.map(x=>x.scrap),1);el.innerHTML=rows.map((x,i)=>`<div class="top-part-row"><div class="top-part-rank">${i+1}</div><div class="top-part-main"><div><strong>${escapeHtml(x.name)}</strong><span>${dashNum(x.scrap)} scrap · ${dashPct(x.rate)}</span></div><div class="mini-track"><i style="width:${Math.max(2,(x.scrap/max)*100)}%"></i></div></div></div>`).join('');}

async function loadDashboardData(force=false){if(!force&&dashboardDataLoaded){renderActiveDashboard();return dashboardState;}if(dashboardLoadingPromise)return dashboardLoadingPromise;if(!sb||!activeCompanyId){dashboardStatus('Supabase configuration or active company is missing.','error');return;}dashboardStatus('Syncing operational data…');dashboardLoadingPromise=(async()=>{try{const [prod,scrap,down,cust,parts,shifts,machines,cycleRows]=await Promise.all([sb.from('production_captures').select('id,production_date,captured_at,shift_id,customer_id,part_number_id,machine_id,operation_id,production_quantity,confirmed,operations(operation_number,operation_name,ideal_cycle_time_seconds),shifts(code,name,start_time,end_time,excluded_planned_minutes),part_numbers(part_number,piece_cost,scrap_cost),machines(code,name)').eq('company_id',activeCompanyId).order('production_date',{ascending:true}),sb.from('scrap_events').select('id,production_capture_id,company_id,scrap_catalog_id,quantity,reason,scrap_catalog(code,defect,category,operation_id,operations(operation_number,operation_name))').eq('company_id',activeCompanyId),sb.from('downtime_events').select('id,production_capture_id,company_id,downtime_catalog_id,minutes,event_type,reason,created_at,downtime_catalog(code,downtime,category)').eq('company_id',activeCompanyId),sb.from('customers').select('id,code,name').eq('company_id',activeCompanyId).order('code'),sb.from('part_numbers').select('id,customer_id,part_number').eq('company_id',activeCompanyId).order('part_number'),sb.from('shifts').select('id,code,name,start_time,end_time,excluded_planned_minutes').eq('company_id',activeCompanyId).order('code'),sb.from('machines').select('id,code,name').eq('company_id',activeCompanyId).order('code'),sb.from('operation_machine_cycle_times').select('part_number_id,operation_id,machine_id,cycle_time_seconds').eq('company_id',activeCompanyId)]);for(const x of [prod,scrap,down,cust,parts,shifts,machines,cycleRows])if(x.error)throw x.error;dashboardState.production=prod.data||[];dashboardState.scrap=scrap.data||[];dashboardState.downtime=down.data||[];dashboardState.customers=cust.data||[];dashboardState.parts=parts.data||[];dashboardState.shifts=shifts.data||[];dashboardState.machines=machines.data||[];dashboardState.cycleTimes=(cycleRows.data||[]).map(x=>({...x,key:`${x.part_number_id||'unknown-part'}|${x.operation_id||'unknown-operation'}|${x.machine_id||'unknown-machine'}`}));dashboardDataLoaded=true;populateDashboardFilters();dashboardState.tab==='Production'?renderProductionDashboard():dashboardState.tab==='Quality'?renderQualityDashboard():dashboardState.tab==='Downtime'?renderDowntimeDashboard():renderDashboardGeneral();}catch(e){console.error('GUVEL dashboard load error',e);dashboardStatus(e.message||'Unable to load Dashboard data.','error');const box=document.getElementById('dashboardGeneral');if(box)box.innerHTML=`<div class="panel"><h2>Dashboard data error</h2><p>${escapeHtml(e.message||'Unable to load Dashboard data.')}</p></div>`;throw e;}finally{dashboardLoadingPromise=null;}})();return dashboardLoadingPromise;}
function populateDashboardFilters(){const c=document.getElementById('dashCustomer'),p=document.getElementById('dashPart'),s=document.getElementById('dashShift'),m=document.getElementById('dashMachine'),f=document.getElementById('dashFrom'),to=document.getElementById('dashTo'),period=document.getElementById('dashPeriod');if(!c||!p||!s||!m)return;const selectedC=dashboardState.filters.customer,selectedP=dashboardState.filters.part;c.innerHTML='<option value="">All Customers</option>'+dashboardState.customers.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('');c.value=selectedC;const parts=selectedC?dashboardState.parts.filter(x=>x.customer_id===selectedC):dashboardState.parts;p.innerHTML='<option value="">All Part Numbers</option>'+parts.map(x=>`<option value="${x.id}">${escapeHtml(x.part_number)}</option>`).join('');p.value=parts.some(x=>x.id===selectedP)?selectedP:'';dashboardState.filters.part=p.value;s.innerHTML='<option value="">All Shifts</option>'+dashboardState.shifts.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('');s.value=dashboardState.filters.shift;m.innerHTML='<option value="">All Machines</option>'+dashboardState.machines.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('');m.value=dashboardState.filters.machine;const pDef=dashboardPeriod();if(f)f.value=dashboardState.filters.from||pDef.from;if(to)to.value=dashboardState.filters.to||pDef.to;if(period)period.value=dashboardState.filters.period||'This Month';}
function fitDashboardFullscreen(){
  const dash=document.getElementById('dash');
  if(!dash || !document.fullscreenElement || dashboardState.tab==='General') return;
  // Non-General dashboards intentionally keep their natural height. Full Screen scrolls vertically inside #app.
  dash.style.removeProperty('transform');
  dash.style.removeProperty('width');
  dash.style.removeProperty('height');
  dash.style.removeProperty('--dash-scale');
}
function toggleDashboardFullscreen(){const app=document.getElementById('app');if(!app)return;if(document.fullscreenElement){document.exitFullscreen?.();return;}document.documentElement.dataset.dashboardTab=dashboardState.tab;const req=app.requestFullscreen?.();if(req&&typeof req.catch==='function')req.catch(()=>{});}
document.addEventListener('fullscreenchange',()=>{document.documentElement.classList.toggle('dashboard-fullscreen',!!document.fullscreenElement);if(document.fullscreenElement){requestAnimationFrame(fitDashboardFullscreen);}else{const dash=document.getElementById('dash');if(dash){dash.style.removeProperty('transform');dash.style.removeProperty('width');dash.style.removeProperty('height');dash.style.removeProperty('--dash-scale');}document.documentElement.classList.remove('dashboard-fit-ready');}});
window.addEventListener('resize',()=>{if(document.fullscreenElement&&dashboardState.tab!=='General')requestAnimationFrame(fitDashboardFullscreen);});
function bindDashboard(){const fs=document.getElementById('dashboardFullscreen');if(fs)fs.onclick=toggleDashboardFullscreen;const c=document.getElementById('dashCustomer'),p=document.getElementById('dashPart'),s=document.getElementById('dashShift'),m=document.getElementById('dashMachine'),f=document.getElementById('dashFrom'),to=document.getElementById('dashTo'),period=document.getElementById('dashPeriod');document.querySelectorAll('[data-dashboard-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-dashboard-tab]').forEach(x=>x.classList.toggle('active',x===b));dashTab(b.dataset.dashboardTab);});const rerender=()=>dashboardState.tab==='Production'?renderProductionDashboard():dashboardState.tab==='Quality'?renderQualityDashboard():dashboardState.tab==='Downtime'?renderDowntimeDashboard():renderDashboardGeneral();const apply=()=>{dashboardState.filters={...dashboardState.filters,from:f.value,to:to.value};rerender();};[f,to,p,s,m].forEach(x=>x.onchange=apply);period.onchange=()=>{const r=resolvePeriod(period.value);dashboardState.filters={...dashboardState.filters,period:period.value,from:r.from,to:r.to};f.value=r.from;to.value=r.to;rerender();};c.onchange=()=>{dashboardState.filters.customer=c.value;dashboardState.filters.part='';populateDashboardFilters();rerender();};document.getElementById('dashboardClear').onclick=()=>{dashboardState.filters={period:'This Month',from:resolvePeriod('This Month').from,to:resolvePeriod('This Month').to,customer:'',part:'',shift:'',machine:''};populateDashboardFilters();rerender();};document.getElementById('dashboardRefresh').onclick=loadDashboardData;const initial=resolvePeriod(dashboardState.filters.period||'This Month');if(!dashboardState.filters.from)dashboardState.filters.from=initial.from;if(!dashboardState.filters.to)dashboardState.filters.to=initial.to;populateDashboardFilters();if(dashboardDataLoaded){renderActiveDashboard();}else{loadDashboardData();}}

function capture(){return head('Capture','Register production, scrap and downtime as one controlled transaction.')}
function fields(a){return a.map(x=>`<div class="field"><label>${x}</label><input placeholder="${x}"></div>`).join('')}
function table(title,cols){return head(title,'Foundation module — ready for Supabase CRUD.')+`<div class="panel"><div class="actions"><button class="primary">Add New</button></div></div><div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody><tr><td colspan="${cols.length}">No records yet.</td></tr></tbody></table></div>`}
function shiftsPage(){return head('Settings — Shifts','Create and maintain production shifts. Excluded planned time is entered as total minutes.')+`<div class="panel section"><div class="section-title"><div><h2 id="shiftFormTitle">Add Shift</h2><p id="shiftFormDesc">All shifts are linked to the active company.</p></div><button id="cancelEdit" class="secondary" style="display:none">Cancel Edit</button></div><form id="shiftForm"><div class="form-grid"><div class="field"><label>Shift Code *</label><input id="shiftCode" required maxlength="50" placeholder="1"></div><div class="field"><label>Shift Name *</label><input id="shiftName" required maxlength="150" placeholder="First Shift"></div><div class="field"><label>Start *</label><input id="shiftStart" type="time" required></div><div class="field"><label>End *</label><input id="shiftEnd" type="time" required></div><div class="field"><label>Excluded Planned Time (minutes)</label><input id="shiftExcluded" type="number" min="0" step="0.01" value="0"></div></div><div class="actions"><button class="primary" type="submit" id="shiftSubmit">Save Shift</button></div><div id="shiftMessage" class="status"></div></form></div><div class="section-title"><div><h2>Registered Shifts</h2><p>Company-scoped master data.</p></div><button id="reloadShifts" class="secondary">Refresh</button></div><div class="table-wrap"><table><thead><tr><th>Code</th><th>Name</th><th>Start</th><th>End</th><th>Excluded Planned Time</th><th>Actions</th></tr></thead><tbody id="shiftsBody"><tr><td colspan="6">Loading shifts...</td></tr></tbody></table></div>`}
let editingShiftId=null;
function setShiftMessage(text,type=''){const el=document.getElementById('shiftMessage');if(!el)return;el.textContent=text;el.className=`status ${type}`;}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
async function loadShifts(){const body=document.getElementById('shiftsBody');if(!body)return;if(!sb){body.innerHTML='<tr><td colspan="6">Supabase configuration is missing.</td></tr>';return;}if(!activeCompanyId){body.innerHTML='<tr><td colspan="6">Active company context is missing.</td></tr>';return;}body.innerHTML='<tr><td colspan="6">Loading shifts...</td></tr>';const {data,error}=await sb.from('shifts').select('*').eq('company_id',activeCompanyId).order('code',{ascending:true});if(error){body.innerHTML=`<tr><td colspan="6">Error: ${escapeHtml(error.message)}</td></tr>`;return;}if(!data.length){body.innerHTML='<tr><td colspan="6">No shifts registered yet.</td></tr>';return;}body.innerHTML=data.map(s=>`<tr><td>${escapeHtml(s.code)}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.start_time)}</td><td>${escapeHtml(s.end_time)}</td><td>${Number(s.excluded_planned_minutes||0)} min</td><td><button class="secondary editShift" data-id="${s.id}">Edit</button> <button class="danger deleteShift" data-id="${s.id}">Delete</button></td></tr>`).join('');document.querySelectorAll('.editShift').forEach(b=>b.onclick=()=>startEdit(data.find(x=>x.id===b.dataset.id)));document.querySelectorAll('.deleteShift').forEach(b=>b.onclick=()=>deleteShift(b.dataset.id));}
function startEdit(s){editingShiftId=s.id;document.getElementById('shiftCode').value=s.code;document.getElementById('shiftName').value=s.name;document.getElementById('shiftStart').value=s.start_time?.slice(0,5)||'';document.getElementById('shiftEnd').value=s.end_time?.slice(0,5)||'';document.getElementById('shiftExcluded').value=s.excluded_planned_minutes||0;document.getElementById('shiftFormTitle').textContent='Edit Shift';document.getElementById('shiftFormDesc').textContent='The existing relationship shifts.company_id is preserved.';document.getElementById('shiftSubmit').textContent='Update Shift';document.getElementById('cancelEdit').style.display='inline-block';setShiftMessage('');window.scrollTo({top:0,behavior:'smooth'});}
function cancelEdit(){editingShiftId=null;const f=document.getElementById('shiftForm');f.reset();document.getElementById('shiftExcluded').value=0;document.getElementById('shiftFormTitle').textContent='Add Shift';document.getElementById('shiftFormDesc').textContent='All shifts are linked to the active company.';document.getElementById('shiftSubmit').textContent='Save Shift';document.getElementById('cancelEdit').style.display='none';setShiftMessage('');}
async function saveShift(e){e.preventDefault();if(!sb||!activeCompanyId)return setShiftMessage('Supabase configuration or active company is missing.','error');const payload={company_id:activeCompanyId,code:document.getElementById('shiftCode').value.trim(),name:document.getElementById('shiftName').value.trim(),start_time:document.getElementById('shiftStart').value,end_time:document.getElementById('shiftEnd').value,excluded_planned_minutes:Number(document.getElementById('shiftExcluded').value||0)};if(!payload.code||!payload.name||!payload.start_time||!payload.end_time)return setShiftMessage('Please complete all required fields.','error');setShiftMessage(editingShiftId?'Updating shift...':'Saving shift...');let result;if(editingShiftId)result=await sb.from('shifts').update({code:payload.code,name:payload.name,start_time:payload.start_time,end_time:payload.end_time,excluded_planned_minutes:payload.excluded_planned_minutes}).eq('id',editingShiftId).eq('company_id',activeCompanyId);else result=await sb.from('shifts').insert(payload);if(result.error)return setShiftMessage(result.error.message,'error');setShiftMessage(editingShiftId?'Shift updated successfully.':'Shift saved successfully.','success');cancelEdit();await loadShifts();}
async function deleteShift(id){if(!confirm('Delete this shift? This action cannot be undone.'))return;const {error}=await sb.from('shifts').delete().eq('id',id).eq('company_id',activeCompanyId);if(error){alert(error.message);return;}if(editingShiftId===id)cancelEdit();await loadShifts();}
function bindShifts(){document.getElementById('shiftForm').onsubmit=saveShift;document.getElementById('cancelEdit').onclick=cancelEdit;document.getElementById('reloadShifts').onclick=loadShifts;loadShifts();}

function customersPage(){
  return head('Customers','Create and maintain customer master data. Every customer belongs to the active company.')
  +`<div class="panel section"><div class="section-title"><div><h2 id="customerFormTitle">Add Customer</h2><p id="customerFormDesc">Relationship preserved: customers.company_id → companies.id.</p></div><button id="cancelCustomerEdit" class="secondary" style="display:none">Cancel Edit</button></div>
  <form id="customerForm"><div class="form-grid">
    <div class="field"><label>Customer Code *</label><input id="customerCode" required maxlength="80" placeholder="CUST-001"></div>
    <div class="field"><label>Customer Name *</label><input id="customerName" required maxlength="200" placeholder="Customer Name"></div>
  </div><div class="actions"><button class="primary" type="submit" id="customerSubmit">Save Customer</button></div><div id="customerMessage" class="status"></div></form></div>
  <div class="section-title"><div><h2>Registered Customers</h2><p>Company-scoped master data. Part-number counts will populate as Part Numbers are added.</p></div><button id="reloadCustomers" class="secondary">Refresh</button></div>
  <div class="table-wrap"><table><thead><tr><th>Customer Code</th><th>Customer Name</th><th>Linked Part Numbers</th><th>Actions</th></tr></thead><tbody id="customersBody"><tr><td colspan="4">Loading customers...</td></tr></tbody></table></div>`;
}
let editingCustomerId=null;
function setCustomerMessage(text,type=''){const el=document.getElementById('customerMessage');if(!el)return;el.textContent=text;el.className=`status ${type}`;}
async function loadCustomers(){
  const body=document.getElementById('customersBody'); if(!body)return;
  if(!sb){body.innerHTML='<tr><td colspan="4">Supabase configuration is missing.</td></tr>';return;}
  if(!activeCompanyId){body.innerHTML='<tr><td colspan="4">Active company is missing.</td></tr>';return;}
  body.innerHTML='<tr><td colspan="4">Loading customers...</td></tr>';
  const {data,error}=await sb.from('customers').select('id,company_id,code,name,created_at,part_numbers(id)').eq('company_id',activeCompanyId).order('code',{ascending:true});
  if(error){body.innerHTML=`<tr><td colspan="4">Error: ${escapeHtml(error.message)}</td></tr>`;return;}
  if(!data.length){body.innerHTML='<tr><td colspan="4">No customers registered yet.</td></tr>';return;}
  body.innerHTML=data.map(c=>`<tr><td>${escapeHtml(c.code)}</td><td>${escapeHtml(c.name)}</td><td>${Array.isArray(c.part_numbers)?c.part_numbers.length:0}</td><td><button class="secondary editCustomer" data-id="${c.id}">Edit</button> <button class="danger deleteCustomer" data-id="${c.id}">Delete</button></td></tr>`).join('');
  document.querySelectorAll('.editCustomer').forEach(b=>b.onclick=()=>startCustomerEdit(data.find(x=>x.id===b.dataset.id)));
  document.querySelectorAll('.deleteCustomer').forEach(b=>b.onclick=()=>deleteCustomer(b.dataset.id));
}
function startCustomerEdit(c){
  editingCustomerId=c.id;
  document.getElementById('customerCode').value=c.code;
  document.getElementById('customerName').value=c.name;
  document.getElementById('customerFormTitle').textContent='Edit Customer';
  document.getElementById('customerFormDesc').textContent='Existing relationship customers.company_id is preserved.';
  document.getElementById('customerSubmit').textContent='Update Customer';
  document.getElementById('cancelCustomerEdit').style.display='inline-block';
  setCustomerMessage('');
  window.scrollTo({top:0,behavior:'smooth'});
}
function cancelCustomerEdit(){
  editingCustomerId=null;
  const f=document.getElementById('customerForm'); if(f)f.reset();
  document.getElementById('customerFormTitle').textContent='Add Customer';
  document.getElementById('customerFormDesc').textContent='Relationship preserved: customers.company_id → companies.id.';
  document.getElementById('customerSubmit').textContent='Save Customer';
  document.getElementById('cancelCustomerEdit').style.display='none';
  setCustomerMessage('');
}
async function saveCustomer(e){
  e.preventDefault();
  if(!sb||!activeCompanyId)return setCustomerMessage('Supabase configuration or active company is missing.','error');
  const code=document.getElementById('customerCode').value.trim();
  const name=document.getElementById('customerName').value.trim();
  if(!code||!name)return setCustomerMessage('Customer code and customer name are required.','error');
  setCustomerMessage(editingCustomerId?'Updating customer...':'Saving customer...');
  let result;
  if(editingCustomerId){
    result=await sb.from('customers').update({code,name}).eq('id',editingCustomerId).eq('company_id',activeCompanyId);
  }else{
    result=await sb.from('customers').insert({company_id:activeCompanyId,code,name});
  }
  if(result.error){
    const msg=result.error.code==='23505'?'Customer code already exists for this company.':result.error.message;
    return setCustomerMessage(msg,'error');
  }
  const wasEditing=!!editingCustomerId;
  cancelCustomerEdit();
  setCustomerMessage(wasEditing?'Customer updated successfully.':'Customer saved successfully.','success');
  await loadCustomers();
}
async function deleteCustomer(id){
  if(!confirm('Delete this customer? Customers linked to Part Numbers cannot be deleted.'))return;
  const {error}=await sb.from('customers').delete().eq('id',id).eq('company_id',activeCompanyId);
  if(error){
    const msg=error.code==='23503'?'This customer cannot be deleted because linked Part Numbers exist.':error.message;
    alert(msg); return;
  }
  if(editingCustomerId===id)cancelCustomerEdit();
  await loadCustomers();
}
function bindCustomers(){
  document.getElementById('customerForm').onsubmit=saveCustomer;
  document.getElementById('cancelCustomerEdit').onclick=cancelCustomerEdit;
  document.getElementById('reloadCustomers').onclick=loadCustomers;
  loadCustomers();
}


function partNumbersPage(){
  return head('Part Numbers','Manage part numbers and open their operational profile without leaving the workspace.')
  +`<div class="master-detail-layout part-number-layout">
    <aside class="master-list panel">
      <div class="master-list-head"><div><div class="eyebrow">MASTER DATA</div><h2>Part Numbers</h2></div><button id="reloadPn" class="icon-refresh" title="Refresh">↻</button></div>
      <button id="toggleAddPn" class="master-add-btn" type="button"><span>＋</span><span>Add Part Number</span></button>
      <div id="pnAddForm" class="master-add-form" hidden>
        <div class="master-add-form-head"><div><div class="eyebrow">NEW RECORD</div><strong id="pnFormTitle">Add Part Number</strong><small id="pnFormDesc">Customer linkage is required.</small></div><button id="closeAddPn" type="button" class="master-add-close" aria-label="Close">×</button></div>
        <form id="pnForm"><div class="compact-form-grid">
          <div class="field"><label>Customer *</label><select id="pnCustomer" required><option value="">Loading customers...</option></select></div>
          <div class="field"><label>Part Number *</label><input id="pnNumber" required maxlength="120" placeholder="Part Number"></div>
          <div class="field"><label>Description</label><input id="pnDescription" maxlength="500" placeholder="Description"></div>
          <div class="field"><label>Cost per Piece</label><input id="pnCostPiece" type="number" min="0" step="0.000001" placeholder="0.000000"></div>
          <div class="field"><label>Scrap Cost</label><input id="pnScrapCost" type="number" min="0" step="0.000001" placeholder="0.000000"></div>
        </div><div class="actions"><button class="primary" type="submit" id="pnSubmit">Save Part Number</button></div><div id="pnMessage" class="status"></div></form>
      </div>
      <div class="master-list-search"><input id="pnListSearch" type="search" placeholder="Search Part Number..."></div>
      <div id="pnList" class="master-list-items"><div class="master-empty">Loading part numbers...</div></div>
    </aside>
    <section class="master-detail-content">
      <div class="panel section profile-workspace" id="pnProfilePanel"><div id="pnProfilePlaceholder" class="profile-placeholder"><div class="profile-placeholder-icon">◫</div><div><div class="eyebrow">PROFILE</div><h2>Select a Part Number</h2><p>Choose a Part Number from the list to open its operational profile.</p></div></div><div id="pnProfileContent"></div></div>
    </section>
  </div>`;
}

let editingPnId=null, pnCache=[], customerCache=[];
function pnMsg(text,type=''){const el=document.getElementById('pnMessage');if(!el)return;el.textContent=text;el.className=`status ${type}`;}
async function loadPnCustomers(selected=''){
  const select=document.getElementById('pnCustomer'); if(!select)return;
  const {data,error}=await sb.from('customers').select('id,code,name').eq('company_id',activeCompanyId).order('code');
  if(error){select.innerHTML='<option value="">Unable to load customers</option>';return;}
  customerCache=data||[];
  select.innerHTML='<option value="">Select Customer</option>'+customerCache.map(c=>`<option value="${c.id}">${escapeHtml(c.code)} — ${escapeHtml(c.name)}</option>`).join('');
  if(selected)select.value=selected;
}
async function loadPartNumbers(){
  const list=document.getElementById('pnList');if(!list)return;
  if(!sb||!activeCompanyId){list.innerHTML='<div class="master-empty">Supabase configuration or active company is missing.</div>';return;}
  list.innerHTML='<div class="master-empty">Loading part numbers...</div>';
  const {data,error}=await sb.from('part_numbers').select('id,company_id,customer_id,part_number,description,piece_cost,scrap_cost,customers(id,code,name)').eq('company_id',activeCompanyId).order('part_number');
  if(error){list.innerHTML=`<div class="master-empty error">${escapeHtml(error.message)}</div>`;return;}
  pnCache=data||[];
  const renderList=(items)=>{list.innerHTML=items.length?items.map(p=>`<div class="master-item-row"><button type="button" class="master-item openPn" data-id="${p.id}"><span class="master-item-icon">▤</span><span class="master-item-copy"><strong>${escapeHtml(p.part_number)}</strong><small>${escapeHtml(p.customers?.code||'No Customer')}</small></span><span class="master-item-arrow">›</span></button><div class="master-item-actions"><button type="button" class="master-action editPn" data-id="${p.id}" title="Edit">✎</button><button type="button" class="master-action danger-text deletePn" data-id="${p.id}" title="Delete">×</button></div></div>`).join(''):'<div class="master-empty">No Part Numbers registered yet.</div>';document.querySelectorAll('.openPn').forEach(b=>b.onclick=()=>openPnProfile(b.dataset.id));document.querySelectorAll('.editPn').forEach(b=>b.onclick=()=>startPnEdit(pnCache.find(x=>x.id===b.dataset.id)));document.querySelectorAll('.deletePn').forEach(b=>b.onclick=()=>deletePn(b.dataset.id));};
  renderList(pnCache);
  const search=document.getElementById('pnListSearch');if(search)search.oninput=()=>{const q=search.value.trim().toLowerCase();renderList(pnCache.filter(p=>`${p.part_number} ${p.description||''} ${p.customers?.code||''} ${p.customers?.name||''}`.toLowerCase().includes(q)));};
  document.querySelectorAll('.editPn').forEach(b=>b.onclick=()=>startPnEdit(pnCache.find(x=>x.id===b.dataset.id)));
}

function formatMoney(v){if(v===null||v===undefined||v==='')return '—';return Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6});}

async function openPnProfile(id){
  const p=pnCache.find(x=>x.id===id);
  if(!p){alert('Part Number record was not found. Please refresh the list.');return;}
  window.pnProfileId=id;
  const placeholder=document.getElementById('pnProfilePlaceholder'); if(placeholder)placeholder.style.display='none';
  const panel=document.getElementById('pnProfilePanel');
  const content=document.getElementById('pnProfileContent');
  if(!panel||!content){alert('Part Number Profile container is unavailable.');return;}
  panel.style.display='block';

  const barcodeSvg=(raw)=>{
    const value=String(raw||'').toUpperCase();
    const patterns={
      '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
      'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn','F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
      'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn','P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn',
      'U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn','Z':'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn'
    };
    const safe=[...value].map(c=>patterns[c]?c:'-').join('');
    const encoded='*'+safe+'*';
    let x=12,bars='';
    for(const ch of encoded){
      const pattern=patterns[ch];
      for(let i=0;i<pattern.length;i++){
        const w=pattern[i]==='w'?3:1;
        if(i%2===0) bars+=`<rect x="${x}" y="8" width="${w}" height="104" fill="#111"/>`;
        x+=w;
      }
      x+=1;
    }
    const width=x+12;
    return `<svg class="barcode-svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="145" viewBox="0 0 ${width} 145" role="img" aria-label="Code 39 barcode for ${escapeHtml(safe)}"><rect width="100%" height="100%" fill="#fff"/>${bars}<text x="${width/2}" y="137" text-anchor="middle" font-family="monospace" font-size="17" fill="#111">${escapeHtml(safe)}</text></svg>`;
  };

  content.innerHTML=`
    <div class="section-title">
      <div><h2>${escapeHtml(p.part_number)}</h2><p>Operational master profile</p></div>
      <button id="closePnProfile" class="secondary" type="button">× Close</button>
    </div>
    <div class="profile-grid">
      <div><strong>Customer</strong><span>${escapeHtml(p.customers?`${p.customers.code} — ${p.customers.name}`:'—')}</span></div>
      <div><strong>Cost per Piece</strong><span>${formatMoney(p.piece_cost)}</span></div>
      <div><strong>Scrap Cost</strong><span>${formatMoney(p.scrap_cost)}</span></div>
      <div><strong>Description</strong><span>${escapeHtml(p.description||'—')}</span></div>
    </div>
    <div class="barcode-card">
      <div class="barcode-label">Código de Barras</div>
      <div class="barcode barcode-container">${barcodeSvg(p.part_number)}</div>
      <code>${escapeHtml(p.part_number)}</code>
    </div>
    <div class="tabs profile-tabs">
      <button class="tab active" type="button" data-pntab="operations">Operations</button>
      <button class="tab" type="button" data-pntab="machines">Machines</button>
      <button class="tab" type="button" data-pntab="cycles">Cycle Times</button>
      <button class="tab" type="button" data-pntab="defects">Defects</button>
    </div>
    <div id="pnTabOperations"></div>
    <div id="pnTabMachines" style="display:none"></div>
    <div id="pnTabCycles" style="display:none"></div>
    <div id="pnTabDefects" style="display:none"></div>`;

  panel.style.display='block';
  document.getElementById('closePnProfile').onclick=()=>{content.innerHTML='';const ph=document.getElementById('pnProfilePlaceholder');if(ph)ph.style.display='flex';};
  document.querySelectorAll('[data-pntab]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-pntab]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    ['operations','machines','cycles','defects'].forEach(k=>{
      const target=document.getElementById('pnTab'+k[0].toUpperCase()+k.slice(1));
      if(target)target.style.display=k===b.dataset.pntab?'block':'none';
    });
  });
  await loadPnProfileOperations(id);
  await loadPnProfileMachines(id);
  await loadPnProfileCycles(id);
  await loadPnProfileDefects(id);
}

async function loadPnProfileOperations(partId){
 const box=document.getElementById('pnTabOperations');if(!box)return;
 box.innerHTML=`<div class="panel section"><h3>Operations</h3><form id="pnOpForm"><div class="form-grid"><div class="field"><label>Operation Number *</label><input id="pnpOpNumber" required></div><div class="field"><label>Operation Name *</label><input id="pnpOpName" required></div></div><div class="actions"><button class="primary">Add Operation</button></div><div id="pnpOpMsg" class="status"></div></form><div class="table-wrap"><table><thead><tr><th>Operation</th><th>Name</th><th>Action</th></tr></thead><tbody id="pnpOpsBody"></tbody></table></div></div>`;
 const load=async()=>{const {data,error}=await sb.from('operations').select('id,operation_number,operation_name').eq('company_id',activeCompanyId).eq('part_number_id',partId).order('operation_number');const body=document.getElementById('pnpOpsBody');body.innerHTML=error?`<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`:(data||[]).map(o=>`<tr><td>${escapeHtml(o.operation_number)}</td><td>${escapeHtml(o.operation_name)}</td><td><button class="danger pnpDelOp" data-id="${o.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="3">No operations.</td></tr>';document.querySelectorAll('.pnpDelOp').forEach(b=>b.onclick=async()=>{if(!confirm('Delete operation? Dependent defects/cycle times may prevent deletion.'))return;const r=await sb.from('operations').delete().eq('id',b.dataset.id).eq('company_id',activeCompanyId);if(r.error)return alert(r.error.message);await load();await loadPnProfileCycles(partId);await loadPnProfileDefects(partId);});};
 document.getElementById('pnOpForm').onsubmit=async e=>{e.preventDefault();const operation_number=document.getElementById('pnpOpNumber').value.trim(),operation_name=document.getElementById('pnpOpName').value.trim();const r=await sb.from('operations').insert({company_id:activeCompanyId,part_number_id:partId,operation_number,operation_name});if(r.error){document.getElementById('pnpOpMsg').textContent=r.error.message;return;}e.target.reset();document.getElementById('pnpOpMsg').textContent='Operation added.';await load();await loadPnProfileCycles(partId);};
 await load();
}
async function loadPnProfileMachines(partId){
 const box=document.getElementById('pnTabMachines');if(!box)return;
 const [{data:machines},{data:links}]=await Promise.all([
   sb.from('machines').select('id,code,name,brand').eq('company_id',activeCompanyId).order('code'),
   sb.from('part_number_machines').select('machine_id').eq('part_number_id',partId)
 ]);
 const selected=new Set((links||[]).map(x=>x.machine_id));
 box.innerHTML=`<div class="panel section"><h3>Machines</h3><p>Relationships are managed here from the Part Number Profile. Machine Profiles are read-only for these links.</p><div class="machine-check-list">${(machines||[]).map(m=>`<label><input type="checkbox" class="pnpMachine" value="${m.id}" ${selected.has(m.id)?'checked':''}> <strong>${escapeHtml(m.code)}</strong> — ${escapeHtml(m.name||'')}</label>`).join('')||'No machines registered.'}</div><div class="actions"><button id="pnpSaveMachines" class="primary">Save Machine</button></div><div id="pnpMachineMsg" class="status"></div></div>`;
 document.getElementById('pnpSaveMachines').onclick=async()=>{const desired=[...document.querySelectorAll('.pnpMachine:checked')].map(x=>x.value);const current=[...selected];const remove=current.filter(x=>!desired.includes(x)),add=desired.filter(x=>!current.includes(x));let errors=[];if(remove.length){const r=await sb.from('part_number_machines').delete().eq('part_number_id',partId).in('machine_id',remove);if(r.error)errors.push(r.error.message);}if(add.length){const r=await sb.from('part_number_machines').insert(add.map(machine_id=>({part_number_id:partId,machine_id})));if(r.error)errors.push(r.error.message);}document.getElementById('pnpMachineMsg').textContent=errors.length?errors.join(' | '):'Machine links saved.';if(!errors.length)await loadPnProfileCycles(partId);};
}
async function loadPnProfileCycles(partId){
 const box=document.getElementById('pnTabCycles');if(!box)return;
 const [{data:ops},{data:machines},{data:rows,error}]=await Promise.all([
  sb.from('operations').select('id,operation_number,operation_name').eq('company_id',activeCompanyId).eq('part_number_id',partId).order('operation_number'),
  sb.from('part_number_machines').select('machine_id,machines(id,code,name)').eq('part_number_id',partId),
  sb.from('operation_machine_cycle_times').select('id,operation_id,machine_id,cycle_time_seconds,operations(operation_number,operation_name),machines(code,name)').eq('company_id',activeCompanyId).eq('part_number_id',partId)
 ]);
 box.innerHTML=`<div class="panel section"><h3>Cycle Times</h3><form id="pnpCycleForm"><div class="form-grid"><div class="field"><label>Operation *</label><select id="pnpCycleOp" required><option value="">Select</option>${(ops||[]).map(o=>`<option value="${o.id}">${escapeHtml(o.operation_number)} — ${escapeHtml(o.operation_name)}</option>`).join('')}</select></div><div class="field"><label>Machine *</label><select id="pnpCycleMachine" required><option value="">Select</option>${(machines||[]).map(x=>`<option value="${x.machine_id}">${escapeHtml(x.machines?.code||'')} — ${escapeHtml(x.machines?.name||'')}</option>`).join('')}</select></div><div class="field"><label>Cycle Time (seconds) *</label><input id="pnpCycleTime" type="number" min="0" step="0.001" required></div></div><div class="actions"><button class="primary">Save Cycle Time</button></div><div id="pnpCycleMsg" class="status"></div></form><div class="table-wrap"><table><thead><tr><th>Operation</th><th>Machine</th><th>Cycle Time (s)</th><th>Action</th></tr></thead><tbody>${error?`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`:(rows||[]).map(r=>`<tr><td>${escapeHtml(r.operations?.operation_number||'')} — ${escapeHtml(r.operations?.operation_name||'')}</td><td>${escapeHtml(r.machines?.code||'')} — ${escapeHtml(r.machines?.name||'')}</td><td>${r.cycle_time_seconds}</td><td><button class="danger pnpDelCycle" data-id="${r.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="4">No cycle times.</td></tr>'}</tbody></table></div></div>`;
 document.getElementById('pnpCycleForm').onsubmit=async e=>{e.preventDefault();const payload={company_id:activeCompanyId,part_number_id:partId,operation_id:document.getElementById('pnpCycleOp').value,machine_id:document.getElementById('pnpCycleMachine').value,cycle_time_seconds:Number(document.getElementById('pnpCycleTime').value)};const r=await sb.from('operation_machine_cycle_times').upsert(payload,{onConflict:'operation_id,machine_id'});if(r.error){document.getElementById('pnpCycleMsg').textContent=r.error.message;return;}await loadPnProfileCycles(partId);};
 document.querySelectorAll('.pnpDelCycle').forEach(b=>b.onclick=async()=>{if(!confirm('Delete cycle time?'))return;const r=await sb.from('operation_machine_cycle_times').delete().eq('id',b.dataset.id).eq('company_id',activeCompanyId);if(r.error)return alert(r.error.message);await loadPnProfileCycles(partId);});
}
async function loadPnProfileDefects(partId){
 const box=document.getElementById('pnTabDefects');if(!box)return;
 const {data,error}=await sb.from('scrap_catalog').select('code,defect,category,operations(operation_number,operation_name)').eq('company_id',activeCompanyId).eq('part_number_id',partId).order('code');
 box.innerHTML=`<div class="panel section"><h3>Defects</h3><p>Read-only view of defects already managed in Catalog.</p><div class="table-wrap"><table><thead><tr><th>Operation</th><th>Code</th><th>Defect</th><th>Category</th></tr></thead><tbody>${error?`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`:(data||[]).map(d=>`<tr><td>${escapeHtml(d.operations?.operation_number||'')} — ${escapeHtml(d.operations?.operation_name||'')}</td><td>${escapeHtml(d.code)}</td><td>${escapeHtml(d.defect)}</td><td>${escapeHtml(d.category)}</td></tr>`).join('')||'<tr><td colspan="4">No defects registered for this Part Number.</td></tr>'}</tbody></table></div></div>`;
}

function closeMachineProfile(){
  const panel=document.getElementById('machineProfilePanel'),content=document.getElementById('machineProfileContent');
  if(content)content.innerHTML='';
  if(panel)panel.style.display='block';
  const placeholder=document.getElementById('machineProfilePlaceholder'); if(placeholder)placeholder.style.display='flex';
}
function startPnEdit(p){
  editingPnId=p.id;
  const addForm=document.getElementById('pnAddForm');if(addForm)addForm.hidden=false;
  document.getElementById('pnNumber').value=p.part_number||'';
  document.getElementById('pnDescription').value=p.description||'';
  document.getElementById('pnCostPiece').value=p.piece_cost??'';
  document.getElementById('pnScrapCost').value=p.scrap_cost??'';
  loadPnCustomers(p.customer_id);
  document.getElementById('pnFormTitle').textContent='Edit Part Number';
  document.getElementById('pnFormDesc').textContent='Existing company_id and customer_id relationships are preserved.';
  document.getElementById('pnSubmit').textContent='Update Part Number';
  const cancel=document.getElementById('cancelPnEdit');if(cancel)cancel.style.display='inline-block';pnMsg('');
  window.scrollTo({top:0,behavior:'smooth'});
}
function cancelPnEdit(){
  editingPnId=null;const addForm=document.getElementById('pnAddForm');if(addForm)addForm.hidden=true;document.getElementById('pnForm').reset();
  document.getElementById('pnFormTitle').textContent='Add Part Number';
  document.getElementById('pnFormDesc').textContent='Customer linkage is required.';
  document.getElementById('pnSubmit').textContent='Save Part Number';
  const cancel=document.getElementById('cancelPnEdit');if(cancel)cancel.style.display='none';pnMsg('');
  loadPnCustomers();
}
function numOrNull(id){const v=document.getElementById(id).value.trim();return v===''?null:Number(v);}
async function savePn(e){
  e.preventDefault();
  const customer_id=document.getElementById('pnCustomer').value;
  const part_number=document.getElementById('pnNumber').value.trim();
  const description=document.getElementById('pnDescription').value.trim()||null;
  const piece_cost=numOrNull('pnCostPiece'),scrap_cost=numOrNull('pnScrapCost');
  if(!customer_id||!part_number)return pnMsg('Customer and Part Number are required.','error');
  if((piece_cost!==null&&piece_cost<0)||(scrap_cost!==null&&scrap_cost<0))return pnMsg('Costs cannot be negative.','error');
  pnMsg(editingPnId?'Updating part number...':'Saving part number...');
  const payload={customer_id,part_number,description,piece_cost,scrap_cost};
  let result;
  if(editingPnId)result=await sb.from('part_numbers').update(payload).eq('id',editingPnId).eq('company_id',activeCompanyId);
  else result=await sb.from('part_numbers').insert({...payload,company_id:activeCompanyId});
  if(result.error){
    const msg=result.error.code==='23505'?'This Part Number already exists for the active company.':result.error.message;
    return pnMsg(msg,'error');
  }
  const wasEditing=!!editingPnId;cancelPnEdit();pnMsg(wasEditing?'Part Number updated successfully.':'Part Number saved successfully.','success');await loadPartNumbers();
}
async function deletePn(id){
  if(!confirm('Delete this Part Number? Future linked operational data may prevent deletion.'))return;
  const {error}=await sb.from('part_numbers').delete().eq('id',id).eq('company_id',activeCompanyId);
  if(error){const msg=error.code==='23503'?'This Part Number cannot be deleted because linked records exist.':error.message;alert(msg);return;}
  if(editingPnId===id)cancelPnEdit();await loadPartNumbers();
}
function bindPartNumbers(){
  document.getElementById('pnForm').onsubmit=savePn;
  const toggle=document.getElementById('toggleAddPn'),form=document.getElementById('pnAddForm'),close=document.getElementById('closeAddPn');
  if(toggle&&form)toggle.onclick=()=>{form.hidden=!form.hidden;if(!form.hidden)document.getElementById('pnNumber')?.focus();};
  if(close&&form)close.onclick=()=>{form.hidden=true;cancelPnEdit();};
  const cancel=document.getElementById('cancelPnEdit');if(cancel)cancel.onclick=cancelPnEdit;
  document.getElementById('reloadPn').onclick=loadPartNumbers;
  loadPnCustomers();loadPartNumbers();
}


function machinesPage(){
  return head('Machines','Manage machines and open their operational profile without leaving the workspace.')
  +`<div class="master-detail-layout machine-layout">
    <aside class="master-list panel">
      <div class="master-list-head"><div><div class="eyebrow">MASTER DATA</div><h2>Machines</h2></div><button id="reloadMachines" class="icon-refresh" title="Refresh">↻</button></div>
      <button id="toggleAddMachine" class="master-add-btn" type="button"><span>＋</span><span>Add Machine</span></button>
      <div id="machineAddForm" class="master-add-form" hidden>
        <div class="master-add-form-head"><div><div class="eyebrow">NEW RECORD</div><strong id="machineFormTitle">Add Machine</strong><small id="machineFormDesc">A machine belongs to the active company.</small></div><button id="closeAddMachine" type="button" class="master-add-close" aria-label="Close">×</button></div>
        <form id="machineForm"><div class="compact-form-grid">
          <div class="field"><label>Brand</label><input id="machineBrand" maxlength="120" placeholder="Brand"></div>
          <div class="field"><label>Machine Code *</label><input id="machineCode" required maxlength="120" placeholder="MACH-001"></div>
          <div class="field"><label>Machine Name *</label><input id="machineName" required maxlength="200" placeholder="Machine Name"></div>
        </div><div class="actions"><button class="primary" type="submit" id="machineSubmit">Save Machine</button></div><div id="machineMessage" class="status"></div></form>
      </div>
      <div class="master-list-search"><input id="machineListSearch" type="search" placeholder="Search Machine..."></div>
      <div id="machinesList" class="master-list-items"><div class="master-empty">Loading machines...</div></div>
    </aside>
    <section class="master-detail-content">
      <div class="panel section profile-workspace" id="machineProfilePanel"><div id="machineProfilePlaceholder" class="profile-placeholder"><div class="profile-placeholder-icon">▥</div><div><div class="eyebrow">PROFILE</div><h2>Select a Machine</h2><p>Choose a Machine from the list to open its operational profile.</p></div></div><div id="machineProfileContent"></div></div>
    </section>
  </div>`;
}

let editingMachineId=null, machineCache=[], machinePnCache=[];
function machineMsg(text,type=''){const el=document.getElementById('machineMessage');if(!el)return;el.textContent=text;el.className=`status ${type}`;}
function escAttr(v){return escapeHtml(v||'').replace(/"/g,'&quot;');}
async function loadMachinePartNumbers(selectedIds=[]){
  const box=document.getElementById('machinePartNumberLinks');if(!box)return;
  if(!sb||!activeCompanyId){box.textContent='Supabase configuration or active company is missing.';return;}
  box.textContent='Loading Part Numbers...';
  const {data,error}=await sb.from('part_numbers').select('id,part_number,description,customer_id,customers(code,name)').eq('company_id',activeCompanyId).order('part_number');
  if(error){box.textContent='Unable to load Part Numbers: '+error.message;return;}
  machinePnCache=data||[];
  if(!machinePnCache.length){box.innerHTML='<div class="empty-links">No Part Numbers registered yet. Create Part Numbers first; you can link them later.</div>';return;}
  const selected=new Set(selectedIds);
  const selectedCount=selected.size;
  box.innerHTML=`<div class="multi-select-shell">
    <button type="button" class="multi-select-toggle" id="machinePnToggle" aria-expanded="false">
      <span id="machinePnToggleText">${selectedCount?selectedCount+' Part Number(s) selected':'Select Part Numbers'}</span>
      <span class="multi-select-arrow">⌄</span>
    </button>
    <div class="multi-select-menu" id="machinePnMenu" hidden>
      <input id="machinePnSearch" class="multi-select-search" type="search" placeholder="Search Part Number, Customer or Description">
      <div id="machinePnOptions" class="multi-select-options">
      ${machinePnCache.map(p=>`<label class="link-check" data-search="${escAttr(`${p.part_number} ${p.description||''} ${p.customers?`${p.customers.code} ${p.customers.name}`:''}`.toLowerCase())}"><input type="checkbox" name="machinePn" value="${p.id}" ${selected.has(p.id)?'checked':''}><span><strong>${escapeHtml(p.part_number)}</strong><small>${escapeHtml(p.customers?`${p.customers.code} — ${p.customers.name}`:'')} ${p.description?`· ${escapeHtml(p.description)}`:''}</small></span></label>`).join('')}
      </div>
    </div>
  </div>`;
  bindMachinePnMultiSelect();
}

function updateMachinePnToggleText(){
  const text=document.getElementById('machinePnToggleText');
  if(!text)return;
  const count=document.querySelectorAll('input[name="machinePn"]:checked').length;
  text.textContent=count?`${count} Part Number(s) selected`:'Select Part Numbers';
}
function bindMachinePnMultiSelect(){
  const toggle=document.getElementById('machinePnToggle');
  const menu=document.getElementById('machinePnMenu');
  const search=document.getElementById('machinePnSearch');
  if(!toggle||!menu)return;
  toggle.onclick=()=>{
    const opening=menu.hidden;
    menu.hidden=!opening;
    toggle.setAttribute('aria-expanded',String(opening));
    if(opening&&search)search.focus();
  };
  document.querySelectorAll('input[name="machinePn"]').forEach(cb=>cb.onchange=updateMachinePnToggleText);
  if(search){
    search.oninput=()=>{
      const q=search.value.trim().toLowerCase();
      document.querySelectorAll('#machinePnOptions .link-check').forEach(row=>{
        row.style.display=!q||row.dataset.search.includes(q)?'flex':'none';
      });
    };
  }
  document.addEventListener('click',function closeMachinePnMenu(e){
    const shell=document.querySelector('.multi-select-shell');
    if(shell&&!shell.contains(e.target)&&!menu.hidden){
      menu.hidden=true;
      toggle.setAttribute('aria-expanded','false');
    }
  },{once:true});
}

function selectedMachinePnIds(){return Array.from(document.querySelectorAll('input[name="machinePn"]:checked')).map(x=>x.value);}
async function loadMachines(){
  const list=document.getElementById('machinesList');if(!list)return;
  if(!sb||!activeCompanyId){list.innerHTML='<div class="master-empty">Supabase configuration or active company is missing.</div>';return;}
  list.innerHTML='<div class="master-empty">Loading machines...</div>';
  const {data,error}=await sb.from('machines').select('id,company_id,brand,code,name,created_at,part_number_machines(part_number_id,part_numbers(id,part_number,description))').eq('company_id',activeCompanyId).order('code');
  if(error){list.innerHTML=`<div class="master-empty error">${escapeHtml(error.message)}</div>`;return;}
  machineCache=data||[];
  const renderList=(items)=>{list.innerHTML=items.length?items.map(m=>`<div class="master-item-row"><button type="button" class="master-item openMachine" data-id="${m.id}"><span class="master-item-icon">▥</span><span class="master-item-copy"><strong>${escapeHtml(m.code)}</strong><small>${escapeHtml(m.name||'')}</small></span><span class="master-item-arrow">›</span></button><div class="master-item-actions"><button type="button" class="master-action editMachine" data-id="${m.id}" title="Edit">✎</button><button type="button" class="master-action danger-text deleteMachine" data-id="${m.id}" title="Delete">×</button></div></div>`).join(''):'<div class="master-empty">No machines registered yet.</div>';document.querySelectorAll('.openMachine').forEach(b=>b.onclick=()=>openMachineProfile(b.dataset.id));document.querySelectorAll('.editMachine').forEach(b=>b.onclick=()=>startMachineEdit(machineCache.find(x=>x.id===b.dataset.id)));document.querySelectorAll('.deleteMachine').forEach(b=>b.onclick=()=>deleteMachine(b.dataset.id));};
  renderList(machineCache);
  const search=document.getElementById('machineListSearch');if(search)search.oninput=()=>{const q=search.value.trim().toLowerCase();renderList(machineCache.filter(m=>`${m.code} ${m.name||''} ${m.brand||''}`.toLowerCase().includes(q)));};
  document.querySelectorAll('.editMachine').forEach(b=>b.onclick=()=>startMachineEdit(machineCache.find(x=>x.id===b.dataset.id)));
}

function openMachineProfile(id){
  const m=machineCache.find(x=>x.id===id);if(!m)return;
  const links=(m.part_number_machines||[]).map(x=>x.part_numbers).filter(Boolean);
  const panel=document.getElementById('machineProfilePanel'),content=document.getElementById('machineProfileContent');
  content.innerHTML=`<div class="section-title profile-title"><div><div class="eyebrow">PROFILE</div><h2>${escapeHtml(m.code)}</h2><p>Operational machine profile</p></div><button id="closeMachineProfile" class="secondary profile-close-btn" type="button">× Close</button></div><div class="profile-grid">
    <div><strong>Brand</strong><span>${escapeHtml(m.brand||'—')}</span></div>
    <div><strong>Machine Code</strong><span>${escapeHtml(m.code)}</span></div>
    <div><strong>Machine Name</strong><span>${escapeHtml(m.name)}</span></div>
    <div><strong>Company Scope</strong><span>Active company only</span></div>
  </div>
  <div class="profile-next"><strong>Linked Part Numbers (${links.length})</strong>${links.length?`<ul class="profile-list">${links.map(p=>`<li><strong>${escapeHtml(p.part_number)}</strong>${p.description?` — ${escapeHtml(p.description)}`:''}</li>`).join('')}</ul>`:'<p>No Part Numbers linked yet.</p>'}
  <div class="profile-next"><strong>Relationship:</strong> part_numbers ↔ part_number_machines ↔ machines. Part Number links are managed exclusively from the Part Number Profile.</div>`;
  panel.style.display='block';
  const placeholder=document.getElementById('machineProfilePlaceholder'); if(placeholder)placeholder.style.display='none';
  const close=document.getElementById('closeMachineProfile');
  if(close)close.onclick=closeMachineProfile;
}

function closeMachineProfile(){
  const panel=document.getElementById('machineProfilePanel'),content=document.getElementById('machineProfileContent');
  if(content)content.innerHTML='';
  if(panel)panel.style.display='block';
  const placeholder=document.getElementById('machineProfilePlaceholder'); if(placeholder)placeholder.style.display='flex';
}
async function startMachineEdit(m){
  editingMachineId=m.id;
  const addForm=document.getElementById('machineAddForm');if(addForm)addForm.hidden=false;
  document.getElementById('machineBrand').value=m.brand||'';
  document.getElementById('machineCode').value=m.code||'';
  document.getElementById('machineName').value=m.name||'';
  const links=(m.part_number_machines||[]).map(x=>x.part_number_id);
  document.getElementById('machineFormTitle').textContent='Edit Machine';
  document.getElementById('machineFormDesc').textContent='Existing machine ID and company relationship are preserved. Linked Part Numbers are read-only here.';
  document.getElementById('machineSubmit').textContent='Update Machine';
  const cancel=document.getElementById('cancelMachineEdit');if(cancel)cancel.style.display='inline-block';
  machineMsg('');window.scrollTo({top:0,behavior:'smooth'});
}
async function cancelMachineEdit(){
  editingMachineId=null;
  const addForm=document.getElementById('machineAddForm');if(addForm)addForm.hidden=true;
  const f=document.getElementById('machineForm');if(f)f.reset();
  document.getElementById('machineFormTitle').textContent='Add Machine';
  document.getElementById('machineFormDesc').textContent='A machine belongs to the active company. Part Number links are managed exclusively from the Part Number Profile.';
  document.getElementById('machineSubmit').textContent='Save Machine';
  const cancel=document.getElementById('cancelMachineEdit');if(cancel)cancel.style.display='none';machineMsg('');
}
async function syncMachinePartNumbers(machineId,partNumberIds){
  const existing=await sb.from('part_number_machines').select('part_number_id').eq('machine_id',machineId);
  if(existing.error)return existing;
  const currentIds=(existing.data||[]).map(x=>x.part_number_id);
  const wanted=new Set(partNumberIds), current=new Set(currentIds);
  const remove=currentIds.filter(id=>!wanted.has(id));
  const add=partNumberIds.filter(id=>!current.has(id));
  if(remove.length){
    const r=await sb.from('part_number_machines').delete().eq('machine_id',machineId).in('part_number_id',remove);
    if(r.error)return r;
  }
  if(add.length){
    const rows=add.map(part_number_id=>({part_number_id,machine_id:machineId}));
    const r=await sb.from('part_number_machines').insert(rows);
    if(r.error)return r;
  }
  return {error:null};
}
async function saveMachine(e){
  e.preventDefault();
  if(!sb||!activeCompanyId)return machineMsg('Supabase configuration or active company is missing.','error');
  const brand=document.getElementById('machineBrand').value.trim()||null;
  const code=document.getElementById('machineCode').value.trim();
  const name=document.getElementById('machineName').value.trim();
  if(!code||!name)return machineMsg('Machine code and machine name are required.','error');
  machineMsg(editingMachineId?'Updating machine...':'Saving machine...');
  let machineId=editingMachineId;
  let result;
  if(editingMachineId){
    result=await sb.from('machines').update({brand,code,name}).eq('id',editingMachineId).eq('company_id',activeCompanyId).select('id').single();
  }else{
    result=await sb.from('machines').insert({company_id:activeCompanyId,brand,code,name}).select('id').single();
  }
  if(result.error){
    const msg=result.error.code==='23505'?'This Machine Code already exists for the active company.':result.error.message;
    return machineMsg(msg,'error');
  }
  machineId=result.data?.id||machineId;
  const wasEditing=!!editingMachineId;
  await cancelMachineEdit();
  machineMsg(wasEditing?'Machine updated successfully.':'Machine saved successfully.','success');
  await loadMachines();
}
async function deleteMachine(id){
  if(!confirm('Delete this Machine? Linked Part Number relationships will be removed. Production records may prevent deletion.'))return;
  const {error}=await sb.from('machines').delete().eq('id',id).eq('company_id',activeCompanyId);
  if(error){const msg=error.code==='23503'?'This Machine cannot be deleted because operational records exist.':error.message;alert(msg);return;}
  if(editingMachineId===id)await cancelMachineEdit();
  await loadMachines();
}
function bindMachines(){
  document.getElementById('machineForm').onsubmit=saveMachine;
  const toggle=document.getElementById('toggleAddMachine'),form=document.getElementById('machineAddForm'),close=document.getElementById('closeAddMachine');
  if(toggle&&form)toggle.onclick=()=>{form.hidden=!form.hidden;if(!form.hidden)document.getElementById('machineCode')?.focus();};
  if(close&&form)close.onclick=()=>{form.hidden=true;cancelMachineEdit();};
  const cancel=document.getElementById('cancelMachineEdit');if(cancel)cancel.onclick=cancelMachineEdit;
  document.getElementById('reloadMachines').onclick=loadMachines;
  loadMachines();
}


function catalogPage(){
return head('Catalog','Manage Scrap Catalog and Downtime Catalog using the reconciled operational architecture.')
+`<div class="notice">Operations are managed exclusively from the Part Number Profile. Catalog is the source of truth for defects and downtime.</div>
<div class="tabs">
<button class="tab active" data-cat="scrap">Scrap Catalog</button>
<button class="tab" data-cat="downtime">Downtime Catalog</button>
</div>
<section id="catScrap">
<div class="panel section">
<div class="section-title"><div><h2 id="scrapTitle">Add Scrap Defect</h2><p>Defects are tied to the selected Part Number and its Operations.</p></div><button id="cancelScrap" class="secondary" style="display:none">Cancel Edit</button></div>
<form id="scrapForm"><div class="form-grid">
<div class="field"><label>Part Number *</label><select id="scrapPartNumber" required></select></div>
<div class="field"><label>Operation *</label><select id="scrapOperation" required disabled><option value="">Select Part Number first</option></select></div>
<div class="field"><label>Code *</label><input id="scrapCode" required maxlength="80"></div>
<div class="field"><label>Defect *</label><input id="scrapDefect" required maxlength="200"></div>
<div class="field"><label>Category *</label><select id="scrapCategory" required><option value="">Select</option><option>Dimensional</option><option>Visual</option><option>Material</option><option>Process</option></select></div>
</div><div class="actions"><button class="primary" type="submit">Save Defect</button></div><div id="scrapMessage" class="status"></div></form>
</div>
<div class="section-title"><div><h2>Scrap Catalog</h2><p>Operation-specific defect catalog.</p></div><button id="reloadScrap" class="secondary">Refresh</button></div>
<div class="table-wrap"><table><thead><tr><th>Part Number</th><th>Operation</th><th>Code</th><th>Defect</th><th>Category</th><th>Actions</th></tr></thead><tbody id="scrapBody"><tr><td colspan="6">Loading...</td></tr></tbody></table></div>
</section>
<section id="catDowntime" style="display:none">
<div class="panel section">
<div class="section-title"><div><h2 id="downtimeTitle">Add Downtime</h2><p>Company-level downtime master catalog.</p></div><button id="cancelDowntime" class="secondary" style="display:none">Cancel Edit</button></div>
<form id="downtimeForm"><div class="form-grid">
<div class="field"><label>Code *</label><input id="downtimeCode" required maxlength="80"></div>
<div class="field"><label>Downtime *</label><input id="downtimeName" required maxlength="200"></div>
<div class="field"><label>Category *</label><select id="downtimeCategory" required><option value="">Select</option><option>Machine</option><option>Tooling</option><option>Quality</option><option>Setup</option><option>Personnel</option><option>Logistics</option><option>Material</option></select></div>
</div><div class="actions"><button class="primary" type="submit">Save Downtime</button></div><div id="downtimeMessage" class="status"></div></form>
</div>
<div class="section-title"><div><h2>Downtime Catalog</h2><p>Standardized downtime events for the active company.</p></div><button id="reloadDowntime" class="secondary">Refresh</button></div>
<div class="table-wrap"><table><thead><tr><th>Code</th><th>Downtime</th><th>Category</th><th>Actions</th></tr></thead><tbody id="downtimeBody"><tr><td colspan="4">Loading...</td></tr></tbody></table></div>
</section>`;
}
let scrapEdit=null,dtEdit=null,scrapRows=[],dtRows=[];

function catStatus(id,msg,type=''){const e=document.getElementById(id);if(e){e.textContent=msg;e.className='status '+type;}}
async function loadPNSelect(id){
 const el=document.getElementById(id);if(!el||!sb||!activeCompanyId)return;
 const {data,error}=await sb.from('part_numbers').select('id,part_number,description').eq('company_id',activeCompanyId).order('part_number');
 if(error){el.innerHTML='<option value="">Unable to load Part Numbers</option>';return;}
 el.innerHTML='<option value="">Select Part Number</option>'+(data||[]).map(x=>`<option value="${x.id}">${escapeHtml(x.part_number)}${x.description?' — '+escapeHtml(x.description):''}</option>`).join('');
}
async function loadScrapOperations(partId,selected=''){
 const el=document.getElementById('scrapOperation');if(!el)return;
 el.disabled=true;el.innerHTML='<option value="">Select Part Number first</option>';
 if(!partId)return;
 const {data,error}=await sb.from('operations').select('id,operation_number,operation_name').eq('company_id',activeCompanyId).eq('part_number_id',partId).order('operation_number');
 if(error){el.innerHTML='<option value="">Unable to load operations</option>';return;}
 el.disabled=false;el.innerHTML='<option value="">Select Operation</option>'+(data||[]).map(o=>`<option value="${o.id}" ${o.id===selected?'selected':''}>${escapeHtml(o.operation_number)} — ${escapeHtml(o.operation_name)}</option>`).join('');
}
async function loadScrap(){
 const body=document.getElementById('scrapBody');if(!body||!sb||!activeCompanyId)return;
 body.innerHTML='<tr><td colspan="6">Loading...</td></tr>';
 const {data,error}=await sb.from('scrap_catalog').select('id,part_number_id,operation_id,code,defect,category,part_numbers(part_number),operations(operation_number,operation_name)').eq('company_id',activeCompanyId).order('code');
 if(error){body.innerHTML=`<tr><td colspan="6">Error: ${escapeHtml(error.message)}</td></tr>`;return;}
 scrapRows=data||[];
 body.innerHTML=scrapRows.length?scrapRows.map(s=>`<tr><td>${escapeHtml(s.part_numbers?.part_number||'—')}</td><td>${escapeHtml(s.operations?.operation_number||'—')}${s.operations?.operation_name?' — '+escapeHtml(s.operations.operation_name):''}</td><td>${escapeHtml(s.code)}</td><td>${escapeHtml(s.defect)}</td><td>${escapeHtml(s.category)}</td><td><button class="secondary editScrap" data-id="${s.id}">Edit</button> <button class="danger deleteScrap" data-id="${s.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="6">No defects registered.</td></tr>';
 document.querySelectorAll('.editScrap').forEach(b=>b.onclick=()=>editScrap(scrapRows.find(x=>x.id===b.dataset.id)));
 document.querySelectorAll('.deleteScrap').forEach(b=>b.onclick=()=>deleteScrap(b.dataset.id));
}
async function editScrap(s){
 scrapEdit=s.id;await loadPNSelect('scrapPartNumber');document.getElementById('scrapPartNumber').value=s.part_number_id;
 await loadScrapOperations(s.part_number_id,s.operation_id);
 document.getElementById('scrapCode').value=s.code;document.getElementById('scrapDefect').value=s.defect;document.getElementById('scrapCategory').value=s.category;
 document.getElementById('scrapTitle').textContent='Edit Scrap Defect';document.getElementById('cancelScrap').style.display='inline-block';
}
async function resetScrap(){scrapEdit=null;document.getElementById('scrapForm').reset();document.getElementById('scrapTitle').textContent='Add Scrap Defect';document.getElementById('cancelScrap').style.display='none';await loadPNSelect('scrapPartNumber');await loadScrapOperations('');catStatus('scrapMessage','');}
async function saveScrap(e){
 e.preventDefault();const part_number_id=document.getElementById('scrapPartNumber').value,operation_id=document.getElementById('scrapOperation').value,code=document.getElementById('scrapCode').value.trim(),defect=document.getElementById('scrapDefect').value.trim(),category=document.getElementById('scrapCategory').value;
 if(!part_number_id||!operation_id||!code||!defect||!category)return catStatus('scrapMessage','Complete all required fields.','error');
 const payload={company_id:activeCompanyId,part_number_id,operation_id,code,defect,category};
 const q=scrapEdit?sb.from('scrap_catalog').update({part_number_id,operation_id,code,defect,category}).eq('id',scrapEdit).eq('company_id',activeCompanyId):sb.from('scrap_catalog').insert(payload);
 const {error}=await q;if(error)return catStatus('scrapMessage',error.message,'error');
 await resetScrap();catStatus('scrapMessage','Defect saved successfully.','success');loadScrap();
}
async function deleteScrap(id){if(!confirm('Delete this defect?'))return;const {error}=await sb.from('scrap_catalog').delete().eq('id',id).eq('company_id',activeCompanyId);if(error)return alert(error.message);loadScrap();}
async function loadDowntime(){
 const body=document.getElementById('downtimeBody');if(!body||!sb||!activeCompanyId)return;
 body.innerHTML='<tr><td colspan="4">Loading...</td></tr>';
 const {data,error}=await sb.from('downtime_catalog').select('id,code,downtime,category').eq('company_id',activeCompanyId).order('code');
 if(error){body.innerHTML=`<tr><td colspan="4">Error: ${escapeHtml(error.message)}</td></tr>`;return;}
 dtRows=data||[];body.innerHTML=dtRows.length?dtRows.map(d=>`<tr><td>${escapeHtml(d.code)}</td><td>${escapeHtml(d.downtime)}</td><td>${escapeHtml(d.category)}</td><td><button class="secondary editDt" data-id="${d.id}">Edit</button> <button class="danger deleteDt" data-id="${d.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="4">No downtime events registered.</td></tr>';
 document.querySelectorAll('.editDt').forEach(b=>b.onclick=()=>editDt(dtRows.find(x=>x.id===b.dataset.id)));
 document.querySelectorAll('.deleteDt').forEach(b=>b.onclick=()=>deleteDt(b.dataset.id));
}
function editDt(d){dtEdit=d.id;document.getElementById('downtimeCode').value=d.code;document.getElementById('downtimeName').value=d.downtime;document.getElementById('downtimeCategory').value=d.category;document.getElementById('downtimeTitle').textContent='Edit Downtime';document.getElementById('cancelDowntime').style.display='inline-block';}
function resetDt(){dtEdit=null;document.getElementById('downtimeForm').reset();document.getElementById('downtimeTitle').textContent='Add Downtime';document.getElementById('cancelDowntime').style.display='none';catStatus('downtimeMessage','');}
async function saveDt(e){
 e.preventDefault();const code=document.getElementById('downtimeCode').value.trim(),downtime=document.getElementById('downtimeName').value.trim(),category=document.getElementById('downtimeCategory').value;
 if(!code||!downtime||!category)return catStatus('downtimeMessage','Complete all required fields.','error');
 const payload={company_id:activeCompanyId,code,downtime,category};
 const q=dtEdit?sb.from('downtime_catalog').update({code,downtime,category}).eq('id',dtEdit).eq('company_id',activeCompanyId):sb.from('downtime_catalog').insert(payload);
 const {error}=await q;if(error)return catStatus('downtimeMessage',error.message,'error');
 resetDt();catStatus('downtimeMessage','Downtime saved successfully.','success');loadDowntime();
}
async function deleteDt(id){if(!confirm('Delete this downtime event?'))return;const {error}=await sb.from('downtime_catalog').delete().eq('id',id).eq('company_id',activeCompanyId);if(error)return alert(error.message);loadDowntime();}
function bindCatalog(){
 document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-cat]').forEach(x=>x.classList.remove('active'));b.classList.add('active');['scrap','downtime'].forEach(k=>document.getElementById('cat'+k[0].toUpperCase()+k.slice(1)).style.display=b.dataset.cat===k?'block':'none');});
 document.getElementById('scrapPartNumber').onchange=e=>loadScrapOperations(e.target.value);document.getElementById('scrapForm').onsubmit=saveScrap;document.getElementById('cancelScrap').onclick=resetScrap;document.getElementById('reloadScrap').onclick=loadScrap;
 document.getElementById('downtimeForm').onsubmit=saveDt;document.getElementById('cancelDowntime').onclick=resetDt;document.getElementById('reloadDowntime').onclick=loadDowntime;
 loadPNSelect('scrapPartNumber');loadScrap();loadDowntime();
}

document.addEventListener('click', async (event)=>{
  const pnButton=event.target.closest('[data-pn-profile]');
  if(pnButton){
    event.preventDefault();
    event.stopPropagation();
    const id=pnButton.dataset.pnProfile;
    if(typeof openPartNumberProfile==='function') await openPnProfile(id);
    return;
  }
  const machineButton=event.target.closest('[data-machine-profile]');
  if(machineButton){
    event.preventDefault();
    event.stopPropagation();
    const id=machineButton.dataset.machineProfile;
    if(typeof openMachineProfile==='function') await openMachineProfile(id);
    return;
  }
});

function page(){switch(current){case'Dashboard':return dashboard();case'Capture':return '';case'Customers':return customersPage();case'Part Numbers':return partNumbersPage();case'Machines':return machinesPage();case'Catalog':return catalogPage();case'Registers':return registersPage();case'Personnel':return '';case'Settings':return shiftsPage();default:return '';}}
async function render(){
  try{
    if(!view) throw new Error('Application view container was not found.');
    if(current==='Personnel'){
      view.innerHTML='';
      await renderPersonnelPage();
      return;
    }
    if(current==='Capture'){
      view.innerHTML='';
      await renderCaptureFoundation();
      return;
    }
    view.innerHTML=page();
    if(current==='Dashboard'){ bindDashboard(); }
    if(current==='Settings') bindShifts();
    if(current==='Customers') bindCustomers();
    if(current==='Part Numbers') bindPartNumbers();
    if(current==='Machines') bindMachines();
    if(current==='Catalog') bindCatalog();
    if(current==='Registers') bindRegisters();
  }catch(error){
    console.error('GUVEL render error:',error);
    view.innerHTML=`<div class="panel"><h2>Module loading error</h2><p>${escapeHtml(error.message||'Unknown error')}</p></div>`;
  }
}
document.getElementById('refreshBtn').onclick=()=>{if(current==='Dashboard')loadDashboardData(true);else if(current==='Registers')loadRegisters(true);else render();};

let activeCompanyId=null;
let currentUser=null;

function showAuth(message=''){
  document.getElementById('app').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('authMessage').textContent=message;
}
function showApp(){document.getElementById('authScreen').classList.add('hidden');document.getElementById('app').classList.remove('hidden');}
async function loadMembership(){
  const {data,error}=await sb.from('company_members').select('company_id, role, companies(name,code)').eq('user_id',currentUser.id).eq('is_active',true).order('created_at',{ascending:true});
  if(error) throw error;
  if(!data || !data.length) return null;
  const m=data[0]; activeCompanyId=m.company_id;
  document.getElementById('companyBadge').textContent=(m.companies?.name||'Company')+' · '+m.role;
  return m;
}
async function bootstrapSession(){
  if(!sb){showAuth('Supabase configuration is missing.');return;}
  const {data:{session}}=await sb.auth.getSession();
  if(!session){showAuth();return;}
  currentUser=session.user;
  try{
    const membership=await loadMembership();
    if(!membership){showCompanySetup();return;}
    showApp(); renderNav(); render();
  }catch(e){showAuth(e.message||'Unable to load your company access.');}
}
function showCompanySetup(){
  document.getElementById('authMode').textContent='Company Setup';
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('signupForm').classList.add('hidden');
  document.getElementById('companySetup').classList.remove('hidden');
  document.getElementById('authMessage').textContent='Your account is ready. Create your company to continue, or ask an existing company owner to add your membership.';
  showAuth();
}
async function login(e){e.preventDefault(); const email=document.getElementById('loginEmail').value.trim(), password=document.getElementById('loginPassword').value; const r=await sb.auth.signInWithPassword({email,password}); if(r.error)return authMsg(r.error.message,true); currentUser=r.data.user; await bootstrapSession();}
async function signup(e){e.preventDefault(); const full_name=document.getElementById('signupName').value.trim(), email=document.getElementById('signupEmail').value.trim(), password=document.getElementById('signupPassword').value; const r=await sb.auth.signUp({email,password,options:{data:{full_name}}}); if(r.error)return authMsg(r.error.message,true); if(!r.data.session){authMsg('Account created. Check your email to confirm the account, then sign in.',false);return;} currentUser=r.data.user; await bootstrapSession();}
function authMsg(msg,error=false){const el=document.getElementById('authMessage');el.textContent=msg;el.className='auth-message '+(error?'error':'success');}
async function createCompany(e){e.preventDefault(); const name=document.getElementById('newCompanyName').value.trim(), code=document.getElementById('newCompanyCode').value.trim(); if(!name||!code)return authMsg('Company name and code are required.',true); const {data,error}=await sb.from('companies').insert({name,code,created_by:currentUser.id}).select().single(); if(error)return authMsg(error.message,true); activeCompanyId=data.id; await loadMembership(); showApp(); renderNav(); render();}
async function logout(){await sb.auth.signOut();activeCompanyId=null;currentUser=null;showAuth('Signed out successfully.');}
function bindAuth(){
 document.getElementById('loginForm').onsubmit=login; document.getElementById('signupForm').onsubmit=signup; document.getElementById('companySetup').onsubmit=createCompany;
 document.getElementById('showSignup').onclick=()=>{document.getElementById('authMode').textContent='Create Account';document.getElementById('loginForm').classList.add('hidden');document.getElementById('signupForm').classList.remove('hidden');authMsg('');};
 document.getElementById('showLogin').onclick=()=>{document.getElementById('authMode').textContent='Sign In';document.getElementById('signupForm').classList.add('hidden');document.getElementById('loginForm').classList.remove('hidden');authMsg('');};
 document.getElementById('logoutBtn').onclick=logout;
}
/* Startup is intentionally deferred until all module renderers are defined. */

/* ===== GUVEL Operational Phase 1.7.A =====
   Capture Foundation & Personnel Module
   Contract: company_id scoped personnel; capture reads master data only.
*/
const GUVEL_PHASE="1.7.A Hotfix 2";
let personnelCache=[];

async function loadPersonnel(){
  const {data,error}=await sb.from('personnel')
    .select('id,company_id,employee_id,first_name,last_name,role,is_active,created_at')
    .eq('company_id',activeCompanyId).order('last_name').order('first_name');
  if(error){console.error(error);alert(error.message);return [];}
  personnelCache=data||[];
  return personnelCache;
}
function personnelFullName(p){return [p.first_name,p.last_name].filter(Boolean).join(' ');}
async function renderPersonnelPage(){
  await loadPersonnel();
  const main=view;
  if(!main)return;
  main.innerHTML=`
    <section class="page-header"><div><h1>Personnel</h1><p>Operational personnel master data</p></div>
    <button class="primary" id="addPersonnelBtn" type="button">Add Personnel</button></section>
    <div id="personnelFormHost"></div>
    <div class="table-wrap"><table><thead><tr>
      <th>Employee ID</th><th>Name</th><th>Last Name</th><th>Role</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>${personnelCache.map(p=>`<tr>
      <td>${escapeHtml(p.employee_id)}</td><td>${escapeHtml(p.first_name)}</td>
      <td>${escapeHtml(p.last_name)}</td><td>${escapeHtml(p.role)}</td>
      <td>${p.is_active?'Active':'Inactive'}</td>
      <td><button class="secondary editPersonnel" data-id="${p.id}">Edit</button>
      <button class="secondary deletePersonnel" data-id="${p.id}">Delete</button></td>
    </tr>`).join('')||'<tr><td colspan="6">No personnel registered.</td></tr>'}</tbody></table></div>`;
  document.getElementById('addPersonnelBtn').onclick=()=>showPersonnelForm();
  document.querySelectorAll('.editPersonnel').forEach(b=>b.onclick=()=>showPersonnelForm(personnelCache.find(x=>x.id===b.dataset.id)));
  document.querySelectorAll('.deletePersonnel').forEach(b=>b.onclick=()=>deletePersonnel(b.dataset.id));
}
function showPersonnelForm(record=null){
  const host=document.getElementById('personnelFormHost'); if(!host)return;
  host.innerHTML=`<div class="panel phase17-form"><h3>${record?'Edit Personnel':'Add Personnel'}</h3>
    <div class="form-grid">
      <label>Employee ID<input id="p17_employee_id" value="${record?escapeHtml(record.employee_id):''}" required></label>
      <label>Name<input id="p17_first_name" value="${record?escapeHtml(record.first_name):''}" required></label>
      <label>Last Name<input id="p17_last_name" value="${record?escapeHtml(record.last_name):''}" required></label>
      <label>Role<select id="p17_role"><option value="Operator" ${record?.role==='Operator'?'selected':''}>Operator</option><option value="Supervisor" ${record?.role==='Supervisor'?'selected':''}>Supervisor</option></select></label>
    </div>
    <div class="form-actions"><button class="primary" id="savePersonnelBtn">Save Personnel</button>
    <button class="secondary" id="cancelPersonnelBtn">Cancel</button></div></div>`;
  document.getElementById('cancelPersonnelBtn').onclick=()=>host.innerHTML='';
  document.getElementById('savePersonnelBtn').onclick=async()=>{
    const payload={company_id:activeCompanyId,
      employee_id:document.getElementById('p17_employee_id').value.trim(),
      first_name:document.getElementById('p17_first_name').value.trim(),
      last_name:document.getElementById('p17_last_name').value.trim(),
      role:document.getElementById('p17_role').value,is_active:true};
    if(!payload.employee_id||!payload.first_name||!payload.last_name){alert('Employee ID, Name and Last Name are required.');return;}
    let q=record?sb.from('personnel').update(payload).eq('id',record.id):sb.from('personnel').insert(payload);
    const {error}=await q;if(error){alert(error.message);return;}await renderPersonnelPage();
  };
}
async function deletePersonnel(id){
  if(!confirm('Delete this personnel record?'))return;
  const {error}=await sb.from('personnel').delete().eq('id',id);
  if(error){alert(error.message);return;}await renderPersonnelPage();
}
function personnelOptions(role, selected=''){
  return personnelCache.filter(p=>p.is_active&&p.role===role)
    .map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${escapeHtml(p.employee_id)} — ${escapeHtml(personnelFullName(p))}</option>`).join('');
}

/* Phase 1.7.A Capture foundation uses existing production_captures as the future source of truth.
   No write is enabled until preflight confirms actual physical columns and RLS. */
async function renderCaptureFoundation(){
  await loadPersonnel();
  const [c,p,m,sh,o,d]=await Promise.all([
    sb.from('customers').select('id,name,code').eq('company_id',activeCompanyId).order('name'),
    sb.from('part_numbers').select('id,customer_id,part_number,description').eq('company_id',activeCompanyId).order('part_number'),
    sb.from('machines').select('id,code,name').eq('company_id',activeCompanyId).order('code'),
    sb.from('shifts').select('id,code,name').eq('company_id',activeCompanyId).order('code'),
    sb.from('operations').select('id,part_number_id,operation_number,operation_name').eq('company_id',activeCompanyId).order('operation_number'),
    sb.from('downtime_catalog').select('id,code,downtime,category').eq('company_id',activeCompanyId).order('code')
  ]);
  const customers=c.data||[],partNumbers=p.data||[],machines=m.data||[],shifts=sh.data||[],operations=o.data||[],downtimeCatalog=d.data||[];
  const defectsByPart={};
  const {data:defects}=await sb.from('scrap_catalog').select('id,code,defect,part_number_id,operation_id').eq('company_id',activeCompanyId).order('code');
  (defects||[]).forEach(x=>(defectsByPart[x.part_number_id]??=[]).push(x));

  // Draft arrays: Scrap/Downtime are part of the Capture and are not persisted until the single SAVE.
  let scrapDraft=[];
  let downtimeDraft=[];
  let saving=false;

  view.innerHTML=`<section class="page-head capture-page-head"><div><div class="eyebrow">GUVEL OPERATIONAL</div><h1>Capture</h1><p>Production, Scrap & Downtime</p></div><div class="capture-live-badge"><span></span>Ready to capture</div></section>

  <div class="panel capture-production-panel"><div class="capture-section-head"><div><div class="eyebrow">01 · PRODUCTION</div><h2>Production Information</h2></div><span class="capture-required">Required fields *</span></div><div class="form-grid capture-production-grid">
  <div class="field"><label for="capDate">Date *</label><input type="date" id="capDate" value="${new Date().toISOString().slice(0,10)}"></div>
  <div class="field"><label for="capShift">Shift *</label><select id="capShift"><option value="">Select Shift</option>${shifts.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="capCustomer">Customer *</label><select id="capCustomer"><option value="">Select Customer</option>${customers.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="capPN">Part Number *</label><select id="capPN"><option value="">Select Part Number</option></select></div>
  <div class="field"><label for="capLot">Lot Number *</label><input id="capLot"></div>
  <div class="field"><label for="capMachine">Machine *</label><select id="capMachine"><option value="">Select Machine</option></select></div>
  <div class="field"><label for="capOperation">Operation *</label><select id="capOperation"><option value="">Select Operation</option></select></div>
  <div class="field"><label for="capQty">Production Quantity *</label><input id="capQty" type="number" min="1"></div>
  <div class="field"><label for="capOperator">Operator *</label><select id="capOperator"><option value="">Select Operator</option>${personnelOptions('Operator')}</select></div>
  <div class="field"><label for="capSupervisor">Supervisor *</label><select id="capSupervisor"><option value="">Select Supervisor</option>${personnelOptions('Supervisor')}</select></div>
  </div></div>

  <div class="capture-secondary-grid capture-event-grid">
    <div class="panel capture-event-panel"><div class="capture-section-head"><div><div class="eyebrow">02 · QUALITY LOSS</div><h3>Scrap</h3></div><span class="capture-count-badge" id="scrapCountBadge">0</span></div>
      <div class="form-grid capture-event-form-grid">
        <div class="field"><label for="capScrapDefect">Defect</label><select id="capScrapDefect"><option value="">Select Part Number first</option></select></div>
        <div class="field"><label for="capScrapQty">Quantity</label><input id="capScrapQty" type="number" min="1"></div>
        <div class="field capture-span-2"><label for="capScrapReason">Reason</label><input id="capScrapReason"></div>
      </div>
      <div class="form-actions capture-event-actions"><button class="secondary" id="addScrapBtn" type="button">Add Scrap</button></div>
      <div id="scrapDraftList" class="capture-draft-list"></div>
      <div id="scrapSuccess" class="capture-success" role="status" aria-live="polite"></div>
    </div>

    <div class="panel capture-event-panel"><div class="capture-section-head"><div><div class="eyebrow">03 · TIME LOSS</div><h3>Downtime</h3></div><span class="capture-count-badge" id="downtimeCountBadge">0</span></div>
      <div class="form-grid capture-event-form-grid">
        <div class="field"><label for="capDowntime">Downtime</label><select id="capDowntime"><option value="">Select Downtime</option>${downtimeCatalog.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.downtime)}</option>`).join('')}</select></div>
        <div class="field"><label for="capDowntimeMinutes">Minutes</label><input id="capDowntimeMinutes" type="number" min="0.01" step="0.01"></div>
        <div class="field"><label for="capDowntimeReason">Reason</label><input id="capDowntimeReason"></div>
        <div class="field"><label for="capDowntimeType">Type</label><select id="capDowntimeType"><option value="">Select Type</option><option value="Planned">Planned</option><option value="Unplanned">Unplanned</option></select></div>
      </div>
      <div class="form-actions capture-event-actions"><button class="secondary" id="addDowntimeBtn" type="button">Add Downtime</button></div>
      <div id="downtimeDraftList" class="capture-draft-list"></div>
      <div id="downtimeSuccess" class="capture-success" role="status" aria-live="polite"></div>
    </div>
  </div>

  <div class="panel capture-save-panel">
    <label class="confirm-row"><input type="checkbox" id="capConfirm"> I confirm that the information is correct</label>
    <div class="form-actions"><button class="primary capture-final-save" id="saveCaptureBtn" type="button">SAVE</button></div>
    <div id="captureSuccess" class="capture-success" role="status" aria-live="polite"></div>
  </div>`;

  const $=id=>document.getElementById(id), customer=$('capCustomer'),pn=$('capPN'),machine=$('capMachine'),op=$('capOperation'),defect=$('capScrapDefect');

  function clearStatus(id){const el=$(id);if(el){el.textContent='';el.className='capture-success';}}
  function showStatus(id,text,type='success'){const el=$(id);if(!el)return;el.textContent=text;el.className='capture-success show'+(type==='error'?' error':'');}
  function renderScrapDraft(){
    const host=$('scrapDraftList'); const badge=$('scrapCountBadge'); if(badge)badge.textContent=String(scrapDraft.length);
    if(!scrapDraft.length){host.innerHTML='<div class="capture-draft-empty">No Scrap added to this Capture.</div>';return;}
    host.innerHTML=`<div class="capture-draft-title">Added Scrap (${scrapDraft.length})</div><div class="capture-draft-table"><table><thead><tr><th>Defect</th><th>Qty</th><th>Reason</th><th></th></tr></thead><tbody>${scrapDraft.map((x,i)=>`<tr><td>${escapeHtml(x.code)} — ${escapeHtml(x.defect)}</td><td>${x.quantity}</td><td>${escapeHtml(x.reason||'—')}</td><td><button class="danger capture-remove" type="button" data-remove-scrap="${i}" aria-label="Remove scrap">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
    host.querySelectorAll('[data-remove-scrap]').forEach(b=>b.onclick=()=>{scrapDraft.splice(Number(b.dataset.removeScrap),1);renderScrapDraft();clearStatus('scrapSuccess');});
  }
  function renderDowntimeDraft(){
    const host=$('downtimeDraftList'); const badge=$('downtimeCountBadge'); if(badge)badge.textContent=String(downtimeDraft.length);
    if(!downtimeDraft.length){host.innerHTML='<div class="capture-draft-empty">No Downtime added to this Capture.</div>';return;}
    host.innerHTML=`<div class="capture-draft-title">Added Downtime (${downtimeDraft.length})</div><div class="capture-draft-table"><table><thead><tr><th>Downtime</th><th>Min.</th><th>Type</th><th>Reason</th><th></th></tr></thead><tbody>${downtimeDraft.map((x,i)=>`<tr><td>${escapeHtml(x.code)} — ${escapeHtml(x.downtime)}</td><td>${x.minutes}</td><td>${escapeHtml(x.event_type)}</td><td>${escapeHtml(x.reason||'—')}</td><td><button class="danger capture-remove" type="button" data-remove-downtime="${i}" aria-label="Remove downtime">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
    host.querySelectorAll('[data-remove-downtime]').forEach(b=>b.onclick=()=>{downtimeDraft.splice(Number(b.dataset.removeDowntime),1);renderDowntimeDraft();clearStatus('downtimeSuccess');});
  }
  function resetDraftForm(){
    $('capScrapDefect').value='';$('capScrapQty').value='';$('capScrapReason').value='';
    $('capDowntime').value='';$('capDowntimeMinutes').value='';$('capDowntimeReason').value='';$('capDowntimeType').value='';
  }
  function resetCaptureForm(){
    $('capDate').value=new Date().toISOString().slice(0,10);$('capShift').value='';$('capCustomer').value='';$('capPN').innerHTML='<option value="">Select Part Number</option>';$('capLot').value='';$('capMachine').innerHTML='<option value="">Select Machine</option>';$('capOperation').innerHTML='<option value="">Select Operation</option>';$('capQty').value='';$('capOperator').value='';$('capSupervisor').value='';$('capScrapDefect').innerHTML='<option value="">Select Part Number first</option>';$('capConfirm').checked=false;scrapDraft=[];downtimeDraft=[];resetDraftForm();renderScrapDraft();renderDowntimeDraft();
  }

  customer.onchange=()=>{const a=partNumbers.filter(x=>x.customer_id===customer.value);pn.innerHTML='<option value="">Select Part Number</option>'+a.map(x=>`<option value="${x.id}">${escapeHtml(x.part_number)}</option>`).join('');machine.innerHTML='<option value="">Select Machine</option>';op.innerHTML='<option value="">Select Operation</option>';defect.innerHTML='<option value="">Select Part Number first</option>';};
  pn.onchange=async()=>{const id=pn.value;if(!id)return;const rel=await sb.from('part_number_machines').select('machine_id').eq('part_number_id',id);const ids=new Set((rel.data||[]).map(x=>x.machine_id));machine.innerHTML='<option value="">Select Machine</option>'+machines.filter(x=>ids.has(x.id)).map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('');const ops=operations.filter(x=>x.part_number_id===id);op.innerHTML='<option value="">Select Operation</option>'+ops.map(x=>`<option value="${x.id}">${escapeHtml(x.operation_number)}${x.operation_name?' — '+escapeHtml(x.operation_name):''}</option>`).join('');defect.innerHTML='<option value="">Select Defect</option>'+((defectsByPart[id]||[]).map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.defect)}</option>`).join(''));};

  $('addScrapBtn').onclick=()=>{
    clearStatus('scrapSuccess');
    const qty=Number($('capScrapQty').value), defectId=defect.value;
    const selected=(defectsByPart[pn.value]||[]).find(x=>x.id===defectId);
    if(!pn.value||!op.value||!selected||qty<1){showStatus('scrapSuccess','Select Part Number, Operation, Defect and a Scrap Quantity greater than 0.','error');return;}
    const productionQty=Number($('capQty').value);
    const existingTotal=scrapDraft.reduce((sum,x)=>sum+Number(x.quantity),0);
    if(productionQty>0 && existingTotal+qty>productionQty){showStatus('scrapSuccess',`Total Scrap (${existingTotal+qty}) cannot exceed Production Quantity (${productionQty}).`,'error');return;}
    scrapDraft.push({scrap_catalog_id:selected.id,code:selected.code,defect:selected.defect,quantity:qty,reason:$('capScrapReason').value.trim()||null});
    renderScrapDraft();
    resetDraftForm();
    showStatus('scrapSuccess','Scrap added to this Capture.','success');
  };

  $('addDowntimeBtn').onclick=()=>{
    clearStatus('downtimeSuccess');
    const dtId=$('capDowntime').value, minutes=Number($('capDowntimeMinutes').value), type=$('capDowntimeType').value;
    const selected=downtimeCatalog.find(x=>x.id===dtId);
    if(!selected||minutes<=0||!type){showStatus('downtimeSuccess','Select Downtime, Minutes greater than 0 and Type.','error');return;}
    downtimeDraft.push({downtime_catalog_id:selected.id,code:selected.code,downtime:selected.downtime,minutes,event_type:type,reason:$('capDowntimeReason').value.trim()||null});
    renderDowntimeDraft();
    resetDraftForm();
    showStatus('downtimeSuccess','Downtime added to this Capture.','success');
  };

  $('capQty').addEventListener('input',()=>{
    const productionQty=Number($('capQty').value),total=scrapDraft.reduce((sum,x)=>sum+Number(x.quantity),0);
    if(productionQty>0&&total>productionQty)showStatus('scrapSuccess',`Current Scrap total (${total}) exceeds Production Quantity (${productionQty}). Remove Scrap before saving.`,'error');
    else if(total===0)clearStatus('scrapSuccess');
  });

  $('saveCaptureBtn').onclick=async()=>{
    if(saving)return;
    const success=$('captureSuccess');success.className='capture-success';success.textContent='';
    if(!$('capConfirm').checked){showStatus('captureSuccess','Please confirm that the information is correct.','error');return;}
    const operator=personnelCache.find(x=>x.id===$('capOperator').value),supervisor=personnelCache.find(x=>x.id===$('capSupervisor').value);
    const productionQty=Number($('capQty').value),scrapTotal=scrapDraft.reduce((sum,x)=>sum+Number(x.quantity),0);
    const payload={company_id:activeCompanyId,production_date:$('capDate').value,shift_id:$('capShift').value,lot_number:$('capLot').value.trim(),customer_id:customer.value,part_number_id:pn.value,machine_id:machine.value,operation_id:op.value,operator_id:operator?.id||null,supervisor_id:supervisor?.id||null,operator_name:operator?personnelFullName(operator):null,supervisor_name:supervisor?personnelFullName(supervisor):null,production_quantity:productionQty,confirmed:true,confirmed_at:new Date().toISOString()};
    if(!payload.production_date||!payload.shift_id||!payload.lot_number||!payload.customer_id||!payload.part_number_id||!payload.machine_id||!payload.operation_id||productionQty<1){showStatus('captureSuccess','Please complete all required production information.','error');return;}
    if(scrapTotal>productionQty){showStatus('captureSuccess',`Total Scrap (${scrapTotal}) cannot exceed Production Quantity (${productionQty}).`,'error');return;}

    saving=true;$('saveCaptureBtn').disabled=true;$('saveCaptureBtn').textContent='SAVING...';
    clearStatus('scrapSuccess');clearStatus('downtimeSuccess');
    let captureId=null;
    try{
      const productionResult=await sb.from('production_captures').insert(payload).select('id').single();
      if(productionResult.error)throw new Error(`Production: ${productionResult.error.message}`);
      captureId=productionResult.data?.id;
      if(!captureId)throw new Error('Production Capture was created but no Capture ID was returned.');

      if(scrapDraft.length){
        const scrapPayload=scrapDraft.map(x=>({production_capture_id:captureId,company_id:activeCompanyId,scrap_catalog_id:x.scrap_catalog_id,quantity:Number(x.quantity),reason:x.reason}));
        const scrapResult=await sb.from('scrap_events').insert(scrapPayload);
        if(scrapResult.error)throw new Error(`Scrap: ${scrapResult.error.message}`);
      }
      if(downtimeDraft.length){
        const downtimePayload=downtimeDraft.map(x=>({production_capture_id:captureId,company_id:activeCompanyId,downtime_catalog_id:x.downtime_catalog_id,minutes:Number(x.minutes),reason:x.reason,event_type:x.event_type}));
        const downtimeResult=await sb.from('downtime_events').insert(downtimePayload);
        if(downtimeResult.error)throw new Error(`Downtime: ${downtimeResult.error.message}`);
      }

      showStatus('captureSuccess','Successfully Saved — Production, Scrap and Downtime are linked to the same Capture.','success');
      dashboardDataLoaded=false;registerDataLoaded=false;
      resetCaptureForm();
    }catch(err){
      if(captureId){
        const rollback=await sb.from('production_captures').delete().eq('id',captureId).eq('company_id',activeCompanyId);
        if(rollback.error)showStatus('captureSuccess',`${err.message} Rollback also failed: ${rollback.error.message}`,'error');
        else showStatus('captureSuccess',`${err.message} Nothing was kept; the Capture was rolled back.`,'error');
      }else showStatus('captureSuccess',err.message||'Could not save Capture.','error');
    }finally{
      saving=false;$('saveCaptureBtn').disabled=false;$('saveCaptureBtn').textContent='SAVE';
    }
  };

  renderScrapDraft();renderDowntimeDraft();
}

/* ===== GUVEL Operational Phase 1.8 — Registers =====
   Read-only operational registers derived from transactional source tables.
   No new tables, columns, or migrations are introduced.
*/
let registerDataLoaded=false;let registerLoadingPromise=null;let registerState={tab:'Production',production:[],scrap:[],downtime:[],customers:[],parts:[],shifts:[]};

function registersPage(){
  return head('Registers','Traceable operational records derived from the Capture transaction.')+`
    <div class="notice register-notice"><strong>Source of truth:</strong> Registers read directly from Production Capture, Scrap Events and Downtime Events. No duplicate register data is created.</div>
    <div class="tabs register-tabs">
      <button class="tab ${registerState.tab==='Production'?'active':''}" data-register-tab="Production">Production</button>
      <button class="tab ${registerState.tab==='Scrap'?'active':''}" data-register-tab="Scrap">Scrap</button>
      <button class="tab ${registerState.tab==='Downtime'?'active':''}" data-register-tab="Downtime">Downtime</button>
    </div>
    <div class="panel register-filter-panel">
      <div class="section-title"><div><h2>Filters</h2><p>Filters apply to the selected register only. Deletions remove the source transaction/event and therefore update future indicators.</p></div><div class="register-head-actions"><button id="registerExport" class="primary register-export-btn" type="button">Export Data</button><button id="registerRefresh" class="secondary" type="button">Refresh</button></div></div>
      <div class="form-grid register-filters">
        <div class="field"><label>Date From</label><input id="regDateFrom" type="date"></div>
        <div class="field"><label>Date To</label><input id="regDateTo" type="date"></div>
        <div class="field"><label>Customer</label><select id="regCustomer"><option value="">All Customers</option></select></div>
        <div class="field"><label>Part Number</label><select id="regPart"><option value="">All Part Numbers</option></select></div>
        <div class="field"><label>Shift</label><select id="regShift"><option value="">All Shifts</option></select></div>
        <div class="field"><label>Search</label><input id="regSearch" type="search" placeholder="Lot, part number, machine, defect..."></div>
      </div>
      <div class="actions"><button id="regClear" class="secondary" type="button">Clear Filters</button></div>
      <div id="registerMessage" class="status" aria-live="polite"></div>
    </div>
    <div id="registerSummary" class="register-summary"></div>
    <div class="table-wrap register-table-wrap"><table id="registerTable"><thead></thead><tbody><tr><td>Loading registers...</td></tr></tbody></table></div>`;
}

function registerSetMessage(text,type=''){const el=document.getElementById('registerMessage');if(!el)return;el.textContent=text;el.className=`status ${type}`;}
function registerDateValue(v){return v?String(v).slice(0,10):'';}
function registerDateTime(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?escapeHtml(v):d.toLocaleString();}
function registerMoney(v){return v==null?'—':Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}

async function loadRegisterMasterData(){
  const [c,p,s]=await Promise.all([
    sb.from('customers').select('id,code,name').eq('company_id',activeCompanyId).order('name'),
    sb.from('part_numbers').select('id,part_number,customer_id').eq('company_id',activeCompanyId).order('part_number'),
    sb.from('shifts').select('id,code,name').eq('company_id',activeCompanyId).order('code')
  ]);
  if(c.error)throw c.error;if(p.error)throw p.error;if(s.error)throw s.error;
  registerState.customers=c.data||[];registerState.parts=p.data||[];registerState.shifts=s.data||[];
}

function populateRegisterFilters(){
  const customer=document.getElementById('regCustomer'),part=document.getElementById('regPart'),shift=document.getElementById('regShift');
  if(!customer)return;
  customer.innerHTML='<option value="">All Customers</option>'+registerState.customers.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('');
  part.innerHTML='<option value="">All Part Numbers</option>'+registerState.parts.map(x=>`<option value="${x.id}">${escapeHtml(x.part_number)}</option>`).join('');
  shift.innerHTML='<option value="">All Shifts</option>'+registerState.shifts.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('');
}

function getRegisterFilters(){return {from:document.getElementById('regDateFrom')?.value||'',to:document.getElementById('regDateTo')?.value||'',customer:document.getElementById('regCustomer')?.value||'',part:document.getElementById('regPart')?.value||'',shift:document.getElementById('regShift')?.value||'',search:(document.getElementById('regSearch')?.value||'').trim().toLowerCase()};}
function registerDateMatch(date,from,to){const d=registerDateValue(date);return (!from||d>=from)&&(!to||d<=to);}

function customerName(id){const x=registerState.customers.find(c=>c.id===id);return x?`${x.code} — ${x.name}`:'—';}
function partName(id){const x=registerState.parts.find(p=>p.id===id);return x?.part_number||'—';}
function shiftName(id){const x=registerState.shifts.find(s=>s.id===id);return x?`${x.code} — ${x.name}`:'—';}

function registerSearchText(r,tab){
  if(tab==='Production')return [r.lot_number,partName(r.part_number_id),customerName(r.customer_id),r.machine?.code,r.machine?.name,r.operation?.operation_number,r.operation?.operation_name,r.operator_name,r.supervisor_name,shiftName(r.shift_id)].join(' ').toLowerCase();
  if(tab==='Scrap')return [r.lot_number,partName(r.part_number_id),customerName(r.customer_id),r.machine?.code,r.machine?.name,r.defect?.code,r.defect?.defect,r.defect?.category,r.operation?.operation_number,r.operation?.operation_name,r.reason].join(' ').toLowerCase();
  return [r.customer_id&&customerName(r.customer_id),partName(r.part_number_id),r.machine?.code,r.machine?.name,r.downtime?.code,r.downtime?.downtime,r.downtime?.category,r.event_type,r.reason].join(' ').toLowerCase();
}

function filteredRegisterRows(tab){
  const f=getRegisterFilters(),rows=registerState[tab.toLowerCase()]||[];
  return rows.filter(r=>{
    const date=r.production_date;
    if(!registerDateMatch(date,f.from,f.to))return false;
    if(f.customer&&r.customer_id!==f.customer)return false;
    if(f.part&&r.part_number_id!==f.part)return false;
    if(f.shift&&r.shift_id!==f.shift)return false;
    return !f.search||registerSearchText(r,tab).includes(f.search);
  });
}

function renderRegisterTable(){
  const tab=registerState.tab,rows=filteredRegisterRows(tab),thead=document.querySelector('#registerTable thead'),tbody=document.querySelector('#registerTable tbody'),summary=document.getElementById('registerSummary');
  if(!thead||!tbody)return;
  if(tab==='Production'){
    thead.innerHTML='<tr><th>Date / Time</th><th>Shift</th><th>Lot</th><th>Customer</th><th>Part Number</th><th>Operation</th><th>Machine</th><th>Operator</th><th>Supervisor</th><th>Production Qty</th><th>Confirmed</th><th>Action</th></tr>';
    tbody.innerHTML=rows.length?rows.map(r=>`<tr><td>${registerDateTime(r.captured_at)}</td><td>${escapeHtml(shiftName(r.shift_id))}</td><td>${escapeHtml(r.lot_number)}</td><td>${escapeHtml(customerName(r.customer_id))}</td><td>${escapeHtml(partName(r.part_number_id))}</td><td>${escapeHtml(r.operation?.operation_number||'')} ${r.operation?.operation_name?'— '+escapeHtml(r.operation.operation_name):''}</td><td>${escapeHtml(r.machine?`${r.machine.code} — ${r.machine.name||''}`:'—')}</td><td>${escapeHtml(r.operator_name||'—')}</td><td>${escapeHtml(r.supervisor_name||'—')}</td><td>${Number(r.production_quantity||0).toLocaleString()}</td><td>${r.confirmed?'Yes':'No'}</td><td><button class="danger register-delete" type="button" data-delete-capture="${r.id}">Delete Capture</button></td></tr>`).join(''):'<tr><td colspan="12" class="empty">No Production records match the selected filters.</td></tr>';
    const total=rows.reduce((n,r)=>n+Number(r.production_quantity||0),0);summary.innerHTML=`<div class="card"><div class="label">Production Records</div><div class="metric">${rows.length.toLocaleString()}</div></div><div class="card"><div class="label">Production Quantity</div><div class="metric">${total.toLocaleString()}</div></div>`;
  } else if(tab==='Scrap'){
    thead.innerHTML='<tr><th>Date / Time</th><th>Shift</th><th>Lot</th><th>Customer</th><th>Part Number</th><th>Operation</th><th>Machine</th><th>Defect Code</th><th>Defect</th><th>Category</th><th>Scrap Qty</th><th>Scrap Cost</th><th>Reason</th><th>Action</th></tr>';
    tbody.innerHTML=rows.length?rows.map(r=>{const cost=Number(r.scrap_cost||0)*Number(r.quantity||0);return `<tr><td>${registerDateTime(r.created_at)}</td><td>${escapeHtml(shiftName(r.shift_id))}</td><td>${escapeHtml(r.lot_number)}</td><td>${escapeHtml(customerName(r.customer_id))}</td><td>${escapeHtml(partName(r.part_number_id))}</td><td>${escapeHtml(r.operation?.operation_number||'')} ${r.operation?.operation_name?'— '+escapeHtml(r.operation.operation_name):''}</td><td>${escapeHtml(r.machine?`${r.machine.code} — ${r.machine.name||''}`:'—')}</td><td>${escapeHtml(r.defect?.code||'—')}</td><td>${escapeHtml(r.defect?.defect||'—')}</td><td>${escapeHtml(r.defect?.category||'—')}</td><td>${Number(r.quantity||0).toLocaleString()}</td><td>${registerMoney(cost)}</td><td>${escapeHtml(r.reason||'—')}</td><td><button class="danger register-delete" type="button" data-delete-scrap="${r.id}">Delete Scrap</button></td></tr>`}).join(''):'<tr><td colspan="14" class="empty">No Scrap records match the selected filters.</td></tr>';
    const total=rows.reduce((n,r)=>n+Number(r.quantity||0),0),cost=rows.reduce((n,r)=>n+Number(r.quantity||0)*Number(r.scrap_cost||0),0);summary.innerHTML=`<div class="card"><div class="label">Scrap Events</div><div class="metric">${rows.length.toLocaleString()}</div></div><div class="card"><div class="label">Scrap Quantity</div><div class="metric">${total.toLocaleString()}</div></div><div class="card"><div class="label">Scrap Cost</div><div class="metric">${registerMoney(cost)}</div></div>`;
  } else {
    thead.innerHTML='<tr><th>Date / Time</th><th>Customer</th><th>Part Number</th><th>Machine</th><th>Downtime Code</th><th>Downtime</th><th>Category</th><th>Type</th><th>Minutes</th><th>Reason</th><th>Action</th></tr>';
    tbody.innerHTML=rows.length?rows.map(r=>`<tr><td>${registerDateTime(r.created_at)}</td><td>${escapeHtml(customerName(r.customer_id))}</td><td>${escapeHtml(partName(r.part_number_id))}</td><td>${escapeHtml(r.machine?`${r.machine.code} — ${r.machine.name||''}`:'—')}</td><td>${escapeHtml(r.downtime?.code||'—')}</td><td>${escapeHtml(r.downtime?.downtime||'—')}</td><td>${escapeHtml(r.downtime?.category||'—')}</td><td>${escapeHtml(r.event_type||'—')}</td><td>${Number(r.minutes||0).toLocaleString(undefined,{maximumFractionDigits:2})}</td><td>${escapeHtml(r.reason||'—')}</td><td><button class="danger register-delete" type="button" data-delete-downtime="${r.id}">Delete Downtime</button></td></tr>`).join(''):'<tr><td colspan="11" class="empty">No Downtime records match the selected filters.</td></tr>';
    const total=rows.reduce((n,r)=>n+Number(r.minutes||0),0);summary.innerHTML=`<div class="card"><div class="label">Downtime Events</div><div class="metric">${rows.length.toLocaleString()}</div></div><div class="card"><div class="label">Downtime Minutes</div><div class="metric">${total.toLocaleString(undefined,{maximumFractionDigits:2})}</div></div>`;
  }
}

async function loadRegisters(force=false){
  if(!force&&registerDataLoaded){populateRegisterFilters();renderRegisterTable();return registerState;}
  if(registerLoadingPromise)return registerLoadingPromise;
  if(!sb||!activeCompanyId){registerSetMessage('Supabase configuration or active company is missing.','error');return;}
  registerSetMessage('Syncing registers…');
  registerLoadingPromise=(async()=>{try{
    await loadRegisterMasterData();
    const [prod,scrap,down]=await Promise.all([
      sb.from('production_captures').select('id,captured_at,production_date,shift_id,lot_number,customer_id,part_number_id,machine_id,operation_id,operator_name,supervisor_name,production_quantity,confirmed,machines(code,name),operations(operation_number,operation_name)').eq('company_id',activeCompanyId).order('captured_at',{ascending:false}),
      sb.from('scrap_events').select('id,production_capture_id,company_id,scrap_catalog_id,quantity,reason,created_at,production_captures!inner(captured_at,production_date,shift_id,lot_number,customer_id,part_number_id,machine_id,operation_id,machines(code,name),operations(operation_number,operation_name),part_numbers!inner(scrap_cost)),scrap_catalog(code,defect,category)').eq('company_id',activeCompanyId).order('created_at',{ascending:false}),
      sb.from('downtime_events').select('id,production_capture_id,company_id,downtime_catalog_id,minutes,reason,event_type,created_at,production_captures!inner(captured_at,production_date,shift_id,customer_id,part_number_id,machine_id,machines(code,name)),downtime_catalog(code,downtime,category)').eq('company_id',activeCompanyId).order('created_at',{ascending:false})
    ]);
    if(prod.error)throw new Error(`Production Register: ${prod.error.message}`);
    if(scrap.error)throw new Error(`Scrap Register: ${scrap.error.message}`);
    if(down.error)throw new Error(`Downtime Register: ${down.error.message}`);
    registerState.production=prod.data||[];
    registerState.scrap=(scrap.data||[]).map(r=>{const p=r.production_captures||{};return {...r,captured_at:p.captured_at,production_date:p.production_date,shift_id:p.shift_id,lot_number:p.lot_number,customer_id:p.customer_id,part_number_id:p.part_number_id,machine_id:p.machine_id,operation_id:p.operation_id,machine:p.machines||p.machine,operation:p.operations||p.operation,defect:r.scrap_catalog||r.scrapCatalog,scrap_cost:p.part_numbers?.scrap_cost||0};});
    registerState.downtime=(down.data||[]).map(r=>{const p=r.production_captures||{};return {...r,captured_at:p.captured_at,production_date:p.production_date,shift_id:p.shift_id,customer_id:p.customer_id,part_number_id:p.part_number_id,machine_id:p.machine_id,machine:p.machines||p.machine,downtime:r.downtime_catalog||r.downtimeCatalog};});
    registerDataLoaded=true;
    registerSetMessage(`Loaded ${registerState.production.length.toLocaleString()} Production, ${registerState.scrap.length.toLocaleString()} Scrap and ${registerState.downtime.length.toLocaleString()} Downtime records.`);
    renderRegisterTable();
    populateRegisterFilters();
    bindRegisterDeleteActions();
    return registerState;
  }catch(e){console.error('GUVEL register load error',e);registerSetMessage(e.message||'Unable to load registers.','error');const body=document.querySelector('#registerTable tbody');if(body)body.innerHTML=`<tr><td class="empty">${escapeHtml(e.message||'Unable to load registers.')}</td></tr>`;throw e;}finally{registerLoadingPromise=null;}})();return registerLoadingPromise;
}

let registerDeleteBusy=false;

async function deleteRegisterRecord(table,id,kind){
  const messages={
    capture:'Delete this Capture completely? This will also delete all Scrap and Downtime events linked to it.',
    scrap:'Delete this Scrap event? It will be permanently removed from the Capture and future indicators.',
    downtime:'Delete this Downtime event? It will be permanently removed from the Capture and future indicators.'
  };
  if(registerDeleteBusy)return;
  if(!id||!activeCompanyId){registerSetMessage('Unable to identify the record or active company.','error');return;}
  if(!window.confirm(messages[kind]))return;
  registerDeleteBusy=true;
  const buttons=document.querySelectorAll('#registerTable .register-delete');
  buttons.forEach(b=>{b.disabled=true;b.dataset.originalText=b.textContent;b.textContent='Deleting…';});
  registerSetMessage(`Deleting ${kind}...`);
  try{
    const {data,error}=await sb.from(table)
      .delete()
      .eq('id',id)
      .eq('company_id',activeCompanyId)
      .select('id');
    if(error)throw error;
    if(!data||data.length===0){
      throw new Error('No record was deleted. The record may already be deleted or the current user is not authorized to delete it.');
    }

    dashboardDataLoaded=false;if(kind==='capture'){
      registerState.production=registerState.production.filter(r=>r.id!==id);
      registerState.scrap=registerState.scrap.filter(r=>r.production_capture_id!==id);
      registerState.downtime=registerState.downtime.filter(r=>r.production_capture_id!==id);
    }else if(kind==='scrap'){
      registerState.scrap=registerState.scrap.filter(r=>r.id!==id);
    }else{
      registerState.downtime=registerState.downtime.filter(r=>r.id!==id);
    }

    renderRegisterTable();
    registerSetMessage(`${kind==='capture'?'Capture':kind==='scrap'?'Scrap':'Downtime'} deleted successfully.`,'success');
  }catch(e){
    console.error('GUVEL register delete error',e);
    registerSetMessage(e.message||`Unable to delete ${kind}.`,'error');
    renderRegisterTable();
  }finally{
    registerDeleteBusy=false;
    bindRegisterDeleteActions();
  }
}

function bindRegisterDeleteActions(){
  const table=document.getElementById('registerTable');
  if(!table||table.dataset.deleteDelegationBound==='true')return;
  table.dataset.deleteDelegationBound='true';
  table.addEventListener('click',event=>{
    const b=event.target.closest('.register-delete');
    if(!b||!table.contains(b))return;
    event.preventDefault();
    if(b.dataset.deleteCapture)deleteRegisterRecord('production_captures',b.dataset.deleteCapture,'capture');
    else if(b.dataset.deleteScrap)deleteRegisterRecord('scrap_events',b.dataset.deleteScrap,'scrap');
    else if(b.dataset.deleteDowntime)deleteRegisterRecord('downtime_events',b.dataset.deleteDowntime,'downtime');
  });
}


function csvEscape(v){const text=String(v??'');return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
function registerExportRows(tab,rows){
  if(tab==='Production') return {headers:['Date/Time','Production Date','Shift','Lot Number','Customer','Part Number','Operation','Machine','Operator','Supervisor','Production Quantity','Confirmed'],data:rows.map(r=>[registerDateTime(r.captured_at),registerDateValue(r.production_date),shiftName(r.shift_id),r.lot_number,customerName(r.customer_id),partName(r.part_number_id),r.operation?`${r.operation.operation_number||''}${r.operation.operation_name?' — '+r.operation.operation_name:''}`:'',r.machine?`${r.machine.code||''}${r.machine.name?' — '+r.machine.name:''}`:'',r.operator_name,r.supervisor_name,r.production_quantity,r.confirmed?'Yes':'No'])};
  if(tab==='Scrap') return {headers:['Date/Time','Production Date','Shift','Lot Number','Customer','Part Number','Operation','Machine','Defect Code','Defect','Category','Scrap Quantity','Scrap Cost','Reason'],data:rows.map(r=>[registerDateTime(r.created_at),registerDateValue(r.production_date),shiftName(r.shift_id),r.lot_number,customerName(r.customer_id),partName(r.part_number_id),r.operation?`${r.operation.operation_number||''}${r.operation.operation_name?' — '+r.operation.operation_name:''}`:'',r.machine?`${r.machine.code||''}${r.machine.name?' — '+r.machine.name:''}`:'',r.defect?.code||'',r.defect?.defect||'',r.defect?.category||'',r.quantity,Number(r.scrap_cost||0),r.reason||''])};
  return {headers:['Date/Time','Production Date','Customer','Part Number','Machine','Downtime Code','Downtime','Category','Type','Minutes','Reason'],data:rows.map(r=>[registerDateTime(r.created_at),registerDateValue(r.production_date),customerName(r.customer_id),partName(r.part_number_id),r.machine?`${r.machine.code||''}${r.machine.name?' — '+r.machine.name:''}`:'',r.downtime?.code||'',r.downtime?.downtime||'',r.downtime?.category||'',r.event_type||'',r.minutes,r.reason||''])};
}
function exportRegisterData(){
  const tab=registerState.tab,rows=filteredRegisterRows(tab),pack=registerExportRows(tab,rows);
  const csv='\ufeff'+[pack.headers,...pack.data].map(row=>row.map(csvEscape).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  const now=new Date(),stamp=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  a.href=url;a.download=`GUVEL Operational Export ${stamp}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  registerSetMessage(`${rows.length.toLocaleString()} ${tab} record(s) exported successfully.`,'success');
}

function bindRegisters(){
  populateRegisterFilters();
  document.querySelectorAll('[data-register-tab]').forEach(b=>b.onclick=()=>{registerState.tab=b.dataset.registerTab;document.querySelectorAll('[data-register-tab]').forEach(x=>x.classList.toggle('active',x===b));renderRegisterTable();});
  ['regDateFrom','regDateTo','regShift','regSearch'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener(el.tagName==='INPUT'&&el.type==='search'?'input':'change',()=>{renderRegisterTable();});});
  const regCustomer=document.getElementById('regCustomer'),regPart=document.getElementById('regPart');
  if(regCustomer)regCustomer.onchange=()=>{
    const currentPart=regPart?.value||'';
    const selectedCustomer=regCustomer.value;
    if(regPart){
      const available=selectedCustomer?registerState.parts.filter(x=>x.customer_id===selectedCustomer):registerState.parts;
      regPart.innerHTML='<option value="">All Part Numbers</option>'+available.map(x=>`<option value="${x.id}">${escapeHtml(x.part_number)}</option>`).join('');
      if(available.some(x=>x.id===currentPart))regPart.value=currentPart;
    }
    renderRegisterTable();
  };
  if(regPart)regPart.onchange=()=>{renderRegisterTable();};
  document.getElementById('regClear').onclick=()=>{['regDateFrom','regDateTo','regSearch'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});['regCustomer','regPart','regShift'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});renderRegisterTable();};
  document.getElementById('registerRefresh').onclick=()=>loadRegisters(true);
  document.getElementById('registerExport').onclick=exportRegisterData;
  if(registerDataLoaded){renderRegisterTable();}else{loadRegisters();}
}

/* ===== GUARANTEED APPLICATION STARTUP — HOTFIX 2 ===== */
window.addEventListener('DOMContentLoaded',()=>{
  bindAuth();
  bootstrapSession();
});
/* GUVEL cursor — desktop only */
(()=>{
  const dot=document.getElementById('laserCursor');
  if(!dot || window.matchMedia('(pointer:coarse)').matches) return;
  document.addEventListener('mousemove',e=>{dot.style.left=e.clientX+'px';dot.style.top=e.clientY+'px';});
  document.addEventListener('mouseover',e=>{if(e.target.closest('button,a,input,select,textarea,.card,.panel,.tab,.nav-item'))document.body.classList.add('cursor-hover');});
  document.addEventListener('mouseout',e=>{if(e.target.closest('button,a,input,select,textarea,.card,.panel,.tab,.nav-item'))document.body.classList.remove('cursor-hover');});
})();
