const cfg=window.GUVEL_CONFIG;let sb=null;
if(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY) sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const navItems=['Dashboard','Capture','Customers','Part Numbers','Machines','Catalog','Registers','Personnel','Settings'];
const nav=document.getElementById('nav'),view=document.getElementById('view');let current='Dashboard';
function renderNav(){nav.innerHTML=navItems.map(x=>`<button class="nav-item ${x===current?'active':''}" data-page="${x}">${x}</button>`).join('');nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{current=b.dataset.page;renderNav();render();});}
function head(title,desc){return `<div class="page-head"><div><div class="eyebrow">GUVEL OPERATIONAL</div><h1>${title}</h1><p>${desc}</p></div></div>`}
function metrics(names){return `<div class="grid">${names.map(n=>`<div class="card"><div class="label">${n}</div><div class="metric">—</div><div class="label">Awaiting data</div></div>`).join('')}</div>`}
function dashboard(){const tabs=['General','Production','Quality','Performance'];return head('Dashboard','Connected operational visibility.')+`<div class="tabs">${tabs.map((x,i)=>`<button class="tab ${i===0?'active':''}" data-tab="${x}">${x}</button>`).join('')}</div><div id="dash"></div>`}
function dashTab(t){let html='';if(t==='General')html=metrics(['OEE','Production','Scrap','PPMs','Yield','COPQ']);if(t==='Production')html=metrics(['OEE','Availability','Performance','Yield']);if(t==='Quality')html=metrics(['Scrap','PPMs','Yield','COPQ'])+`<div class="section"><h2>Top 3 Products — Top 3 Defects</h2><div class="placeholder">Three product tables will be generated from registered scrap data.</div></div>`;if(t==='Performance')html=metrics(['Downtime','Events']);document.getElementById('dash').innerHTML=html;}
function capture(){return head('Capture','Register production, scrap and downtime as one controlled transaction.')+`<div class="notice">A production capture may contain multiple scrap events and multiple downtime events.</div><div class="panel section"><h2>Production</h2><div class="form-grid">${fields(['Part Number','Lot Number','Quantity','Date','Shift','Machine','Operation Number','Operator','Supervisor'])}</div></div><div class="panel"><h2>Scrap Events</h2><div class="form-grid">${fields(['Defect','Quantity','Reason'])}</div><div class="actions"><button>Add Scrap Event</button></div></div><div class="panel"><h2>Downtime Events</h2><div class="form-grid">${fields(['Downtime','Minutes','Reason','Type: Planned / Unplanned'])}</div><div class="actions"><button>Add Downtime Event</button></div></div><div class="panel"><label class="confirm"><input type="checkbox"> I confirm the information is correct.</label><div class="actions"><button class="primary">Confirm & Save Capture</button></div></div>`}
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
  return head('Part Numbers','Create and maintain company-scoped part numbers. Customer linkage is required.')
  +`<div class="panel section"><div class="section-title"><div><h2 id="pnFormTitle">Add Part Number</h2><p id="pnFormDesc">Required relationship: part_numbers.customer_id → customers.id.</p></div><button id="cancelPnEdit" class="secondary" style="display:none">Cancel Edit</button></div>
  <form id="pnForm"><div class="form-grid">
    <div class="field"><label>Customer *</label><select id="pnCustomer" required><option value="">Loading customers...</option></select></div>
    <div class="field"><label>Part Number *</label><input id="pnNumber" required maxlength="120" placeholder="Part Number"></div>
    <div class="field"><label>Description</label><input id="pnDescription" maxlength="500" placeholder="Description"></div>
    <div class="field"><label>Cost per Piece</label><input id="pnCostPiece" type="number" min="0" step="0.000001" placeholder="0.000000"></div>
    <div class="field"><label>Scrap Cost</label><input id="pnScrapCost" type="number" min="0" step="0.000001" placeholder="0.000000"></div>
  </div><div class="actions"><button class="primary" type="submit" id="pnSubmit">Save Part Number</button></div><div id="pnMessage" class="status"></div></form></div>
  <div class="section-title"><div><h2>Registered Part Numbers</h2><p>Each record remains scoped to the active company and linked to one customer.</p></div><button id="reloadPn" class="secondary">Refresh</button></div>
  <div class="table-wrap"><table><thead><tr><th>Part Number</th><th>Customer</th><th>Description</th><th>Cost / Piece</th><th>Scrap Cost</th><th>Actions</th></tr></thead><tbody id="pnBody"><tr><td colspan="6">Loading part numbers...</td></tr></tbody></table></div>
  <div class="panel section" id="pnProfilePanel" style="display:none"><div class="section-title"><div><h2>Part Number Profile</h2><p>Foundation for future Operations, Machines, Cycle Time and Defects.</p></div></div><div id="pnProfileContent"></div></div>`;
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
  const body=document.getElementById('pnBody');if(!body)return;
  if(!sb||!activeCompanyId){body.innerHTML='<tr><td colspan="6">Supabase configuration or active company is missing.</td></tr>';return;}
  body.innerHTML='<tr><td colspan="6">Loading part numbers...</td></tr>';
  const {data,error}=await sb.from('part_numbers').select('id,company_id,customer_id,part_number,description,piece_cost,scrap_cost,customers(id,code,name)').eq('company_id',activeCompanyId).order('part_number');
  if(error){body.innerHTML=`<tr><td colspan="6">Error: ${escapeHtml(error.message)}</td></tr>`;return;}
  pnCache=data||[];
  if(!pnCache.length){body.innerHTML='<tr><td colspan="6">No part numbers registered yet.</td></tr>';return;}
  body.innerHTML=pnCache.map(p=>`<tr><td><button type="button" class="profile-entry profile-entry-pn openPn" data-id="${p.id}" title="Open Part Number Profile"><span>${escapeHtml(p.part_number)}</span><small>OPEN PROFILE →</small></button></td><td>${escapeHtml(p.customers?`${p.customers.code} — ${p.customers.name}`:'')}</td><td>${escapeHtml(p.description||'')}</td><td>${formatMoney(p.piece_cost)}</td><td>${formatMoney(p.scrap_cost)}</td><td><button class="secondary editPn" data-id="${p.id}">Edit</button> <button class="danger deletePn" data-id="${p.id}">Delete</button></td></tr>`).join('');
  document.querySelectorAll('.openPn').forEach(b=>{
    b.onclick=(event)=>{ event.preventDefault(); event.stopPropagation(); openPnProfile(b.dataset.id); };
  });
  document.querySelectorAll('.editPn').forEach(b=>b.onclick=()=>startPnEdit(pnCache.find(x=>x.id===b.dataset.id)));
  document.querySelectorAll('.deletePn').forEach(b=>b.onclick=()=>deletePn(b.dataset.id));
}
function formatMoney(v){if(v===null||v===undefined||v==='')return '—';return Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6});}

async function openPnProfile(id){
  const p=pnCache.find(x=>x.id===id);
  if(!p){alert('Part Number record was not found. Please refresh the list.');return;}
  window.pnProfileId=id;
  const panel=document.getElementById('pnProfilePanel');
  const content=document.getElementById('pnProfileContent');
  if(!panel||!content){alert('Part Number Profile container is unavailable.');return;}

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
        if(i%2===0) bars+=`<rect x="${x}" y="8" width="${w}" height="78" fill="#111"/>`;
        x+=w;
      }
      x+=1;
    }
    const width=x+12;
    return `<svg class="barcode-svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="112" viewBox="0 0 ${width} 112" role="img" aria-label="Code 39 barcode for ${escapeHtml(safe)}"><rect width="100%" height="100%" fill="#fff"/>${bars}<text x="${width/2}" y="104" text-anchor="middle" font-family="monospace" font-size="14" fill="#111">${escapeHtml(safe)}</text></svg>`;
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
      <strong>Automatic Identification — Part Number Barcode</strong>
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
  document.getElementById('closePnProfile').onclick=()=>panel.style.display='none';
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
  panel.scrollIntoView({behavior:'smooth',block:'start'});
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
  const panel=document.getElementById('machineProfilePanel');
  if(panel)panel.style.display='none';
}
function startPnEdit(p){
  editingPnId=p.id;
  document.getElementById('pnNumber').value=p.part_number||'';
  document.getElementById('pnDescription').value=p.description||'';
  document.getElementById('pnCostPiece').value=p.piece_cost??'';
  document.getElementById('pnScrapCost').value=p.scrap_cost??'';
  loadPnCustomers(p.customer_id);
  document.getElementById('pnFormTitle').textContent='Edit Part Number';
  document.getElementById('pnFormDesc').textContent='Existing company_id and customer_id relationships are preserved.';
  document.getElementById('pnSubmit').textContent='Update Part Number';
  document.getElementById('cancelPnEdit').style.display='inline-block';pnMsg('');
  window.scrollTo({top:0,behavior:'smooth'});
}
function cancelPnEdit(){
  editingPnId=null;document.getElementById('pnForm').reset();
  document.getElementById('pnFormTitle').textContent='Add Part Number';
  document.getElementById('pnFormDesc').textContent='Required relationship: part_numbers.customer_id → customers.id.';
  document.getElementById('pnSubmit').textContent='Save Part Number';
  document.getElementById('cancelPnEdit').style.display='none';pnMsg('');
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
  document.getElementById('cancelPnEdit').onclick=cancelPnEdit;
  document.getElementById('reloadPn').onclick=loadPartNumbers;
  loadPnCustomers();loadPartNumbers();
}


function machinesPage(){
  return head('Machines','Create company-scoped machines. Linked Part Numbers are viewed here and managed from the Part Number Profile.')
  +`<div class="notice">Architecture preserved: machines.company_id → companies.id. Links are stored in part_number_machines; neither machines nor part_numbers are duplicated.</div>
  <div class="panel section">
    <div class="section-title"><div><h2 id="machineFormTitle">Add Machine</h2><p id="machineFormDesc">A machine belongs to the active company. Part Number links are managed exclusively from the Part Number Profile.</p></div><button id="cancelMachineEdit" class="secondary" style="display:none">Cancel Edit</button></div>
    <form id="machineForm"><div class="form-grid">
      <div class="field"><label>Brand</label><input id="machineBrand" maxlength="120" placeholder="Brand"></div>
      <div class="field"><label>Machine Code *</label><input id="machineCode" required maxlength="120" placeholder="MACH-001"></div>
      <div class="field"><label>Machine Name *</label><input id="machineName" required maxlength="200" placeholder="Machine Name"></div>
    </div>
    <div class="notice">Part Number links are managed exclusively from the Part Number Profile. This module only creates and maintains machine master data.</div>
    <div class="actions"><button class="primary" type="submit" id="machineSubmit">Save Machine</button></div><div id="machineMessage" class="status"></div>
    </form>
  </div>
  <div class="section-title"><div><h2>Registered Machines</h2><p>Machine master data is company-scoped. Linked Part Numbers are counted from part_number_machines.</p></div><button id="reloadMachines" class="secondary">Refresh</button></div>
  <div class="table-wrap"><table><thead><tr><th>Brand</th><th>Code</th><th>Name</th><th>Linked Part Numbers</th><th>Actions</th></tr></thead><tbody id="machinesBody"><tr><td colspan="5">Loading machines...</td></tr></tbody></table></div>
  <div class="panel section" id="machineProfilePanel" style="display:none"><div class="section-title"><div><h2>Machine Profile</h2><p>Machine master data and linked Part Numbers.</p></div><button id="closeMachineProfile" class="profile-close" type="button" aria-label="Close Machine Profile" title="Close">×</button></div><div id="machineProfileContent"></div></div>`;
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
  const body=document.getElementById('machinesBody');if(!body)return;
  if(!sb||!activeCompanyId){body.innerHTML='<tr><td colspan="5">Supabase configuration or active company is missing.</td></tr>';return;}
  body.innerHTML='<tr><td colspan="5">Loading machines...</td></tr>';
  const {data,error}=await sb.from('machines').select('id,company_id,brand,code,name,created_at,part_number_machines(part_number_id,part_numbers(id,part_number,description))').eq('company_id',activeCompanyId).order('code');
  if(error){body.innerHTML=`<tr><td colspan="5">Error: ${escapeHtml(error.message)}</td></tr>`;return;}
  machineCache=data||[];
  if(!machineCache.length){body.innerHTML='<tr><td colspan="5">No machines registered yet.</td></tr>';return;}
  body.innerHTML=machineCache.map(m=>{
    const links=Array.isArray(m.part_number_machines)?m.part_number_machines:[];
    return `<tr><td>${escapeHtml(m.brand||'—')}</td><td><button type="button" class="profile-entry profile-entry-machine openMachine" data-id="${m.id}" title="Open Machine Profile"><span>${escapeHtml(m.code)}</span><small>OPEN PROFILE →</small></button></td><td>${escapeHtml(m.name)}</td><td>${links.length}</td><td><button class="secondary editMachine" data-id="${m.id}">Edit</button> <button class="danger deleteMachine" data-id="${m.id}">Delete</button></td></tr>`;
  }).join('');
  document.querySelectorAll('.openMachine').forEach(b=>{
    b.onclick=(event)=>{ event.preventDefault(); event.stopPropagation(); openMachineProfile(b.dataset.id); };
  });
  document.querySelectorAll('.editMachine').forEach(b=>b.onclick=()=>startMachineEdit(machineCache.find(x=>x.id===b.dataset.id)));
  document.querySelectorAll('.deleteMachine').forEach(b=>b.onclick=()=>deleteMachine(b.dataset.id));
}
function openMachineProfile(id){
  const m=machineCache.find(x=>x.id===id);if(!m)return;
  const links=(m.part_number_machines||[]).map(x=>x.part_numbers).filter(Boolean);
  const panel=document.getElementById('machineProfilePanel'),content=document.getElementById('machineProfileContent');
  content.innerHTML=`<div class="profile-grid">
    <div><strong>Brand</strong><span>${escapeHtml(m.brand||'—')}</span></div>
    <div><strong>Machine Code</strong><span>${escapeHtml(m.code)}</span></div>
    <div><strong>Machine Name</strong><span>${escapeHtml(m.name)}</span></div>
    <div><strong>Company Scope</strong><span>Active company only</span></div>
  </div>
  <div class="profile-next"><strong>Linked Part Numbers (${links.length})</strong>${links.length?`<ul class="profile-list">${links.map(p=>`<li><strong>${escapeHtml(p.part_number)}</strong>${p.description?` — ${escapeHtml(p.description)}`:''}</li>`).join('')}</ul>`:'<p>No Part Numbers linked yet.</p>'}
  <div class="profile-next"><strong>Relationship:</strong> part_numbers ↔ part_number_machines ↔ machines. Part Number links are managed exclusively from the Part Number Profile.</div>`;
  panel.style.display='block';
  const close=document.getElementById('closeMachineProfile');
  if(close)close.onclick=closeMachineProfile;
  panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function closeMachineProfile(){
  const panel=document.getElementById('machineProfilePanel');
  if(panel)panel.style.display='none';
}
async function startMachineEdit(m){
  editingMachineId=m.id;
  document.getElementById('machineBrand').value=m.brand||'';
  document.getElementById('machineCode').value=m.code||'';
  document.getElementById('machineName').value=m.name||'';
  const links=(m.part_number_machines||[]).map(x=>x.part_number_id);
  document.getElementById('machineFormTitle').textContent='Edit Machine';
  document.getElementById('machineFormDesc').textContent='Existing machine ID and company relationship are preserved. Linked Part Numbers are read-only here.';
  document.getElementById('machineSubmit').textContent='Update Machine';
  document.getElementById('cancelMachineEdit').style.display='inline-block';
  machineMsg('');window.scrollTo({top:0,behavior:'smooth'});
}
async function cancelMachineEdit(){
  editingMachineId=null;
  const f=document.getElementById('machineForm');if(f)f.reset();
  document.getElementById('machineFormTitle').textContent='Add Machine';
  document.getElementById('machineFormDesc').textContent='A machine belongs to the active company. Part Number links are managed exclusively from the Part Number Profile.';
  document.getElementById('machineSubmit').textContent='Save Machine';
  document.getElementById('cancelMachineEdit').style.display='none';machineMsg('');
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
  document.getElementById('cancelMachineEdit').onclick=cancelMachineEdit;
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

function page(){switch(current){case'Dashboard':return dashboard();case'Capture':return '';case'Customers':return customersPage();case'Part Numbers':return partNumbersPage();case'Machines':return machinesPage();case'Catalog':return catalogPage();case'Registers':return table('Registers',['Production / Scrap / Downtime','Date / Time','Shift','Lot / Event','Part Number','Quantity / Minutes']);case'Personnel':return '';case'Settings':return shiftsPage();default:return '';}}
async function render(){
  view.innerHTML=page();
  if(current==='Capture') return await renderCaptureFoundation();
  if(current==='Personnel') return await renderPersonnelPage();
  if(current==='Dashboard'){dashTab('General');document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');dashTab(b.dataset.tab);});}
  if(current==='Settings')bindShifts();if(current==='Customers')bindCustomers();if(current==='Part Numbers')bindPartNumbers();if(current==='Machines')bindMachines();if(current==='Catalog')bindCatalog();
}
document.getElementById('refreshBtn').onclick=()=>render();

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
bindAuth(); bootstrapSession();


/* ===== GUVEL Operational Phase 1.7.A =====
   Capture Foundation & Personnel Module
   Contract: company_id scoped personnel; capture reads master data only.
*/
const GUVEL_PHASE="1.7.A Hotfix 1";
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
  await Promise.all([loadPersonnel()]);
  const [customersRes,pnRes,machineRes,shiftRes,opsRes]=await Promise.all([
    sb.from('customers').select('id,name,code').eq('company_id',activeCompanyId).order('name'),
    sb.from('part_numbers').select('id,customer_id,part_number,description').eq('company_id',activeCompanyId).order('part_number'),
    sb.from('machines').select('id,code,name').eq('company_id',activeCompanyId).order('code'),
    sb.from('shifts').select('id,code,name,start_time,end_time').eq('company_id',activeCompanyId).order('code'),
    sb.from('operations').select('id,part_number_id,operation_number,operation_name').eq('company_id',activeCompanyId).order('operation_number')
  ]);
  const customers=customersRes.data||[], partNumbers=pnRes.data||[], machines=machineRes.data||[], shifts=shiftRes.data||[], operations=opsRes.data||[];
  const main=view; if(!main)return;
  main.innerHTML=`<section class="page-header"><div><h1>Capture</h1><p>Production capture foundation — Phase 1.7.A</p></div></section>
  <div class="panel"><h3>Production Information</h3><div class="form-grid">
    <label>Date<input type="date" id="capDate" value="${new Date().toISOString().slice(0,10)}"></label>
    <label>Shift<select id="capShift"><option value="">Select Shift</option>${shifts.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('')}</select></label>
    <label>Customer<select id="capCustomer"><option value="">Select Customer</option>${customers.map(x=>`<option value="${x.id}">${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join('')}</select></label>
    <label>Part Number<select id="capPN"><option value="">Select Part Number</option></select></label>
    <label>Lot Number<input id="capLot" type="text"></label>
    <label>Machine<select id="capMachine"><option value="">Select Machine</option></select></label>
    <label>Operation<select id="capOperation"><option value="">Select Operation</option></select></label>
    <label>Production Quantity<input id="capQty" type="number" min="1" step="1"></label>
    <label>Operator<select id="capOperator"><option value="">Select Operator</option>${personnelOptions('Operator')}</select></label>
    <label>Supervisor<select id="capSupervisor"><option value="">Select Supervisor</option>${personnelOptions('Supervisor')}</select></label>
  </div>
  <label class="confirm-row"><input type="checkbox" id="capConfirm"> I confirm that the information is correct</label>
  <div class="form-actions"><button class="primary" id="saveCaptureBtn" type="button">Save Production Capture</button></div></div>`;
  const capCustomer=document.getElementById('capCustomer'),capPN=document.getElementById('capPN'),capMachine=document.getElementById('capMachine'),capOperation=document.getElementById('capOperation');
  capCustomer.onchange=()=>{
    const list=partNumbers.filter(p=>p.customer_id===capCustomer.value);
    capPN.innerHTML='<option value="">Select Part Number</option>'+list.map(p=>`<option value="${p.id}">${escapeHtml(p.part_number)}${p.description?' — '+escapeHtml(p.description):''}</option>`).join('');
    capMachine.innerHTML='<option value="">Select Machine</option>';capOperation.innerHTML='<option value="">Select Operation</option>';
  };
  capPN.onchange=async()=>{
    const pnId=capPN.value;
    const [relRes]=await Promise.all([sb.from('part_number_machines').select('machine_id').eq('part_number_id',pnId)]);
    const machineIds=new Set((relRes.data||[]).map(r=>r.machine_id));
    capMachine.innerHTML='<option value="">Select Machine</option>'+machines.filter(m=>machineIds.has(m.id)).map(m=>`<option value="${m.id}">${escapeHtml(m.code)} — ${escapeHtml(m.name)}</option>`).join('');
    capOperation.innerHTML='<option value="">Select Operation</option>'+operations.filter(o=>o.part_number_id===pnId).map(o=>`<option value="${o.id}">${escapeHtml(o.operation_number)}${o.operation_name?' — '+escapeHtml(o.operation_name):''}</option>`).join('');
  };
  document.getElementById('saveCaptureBtn').onclick=async()=>{
    const val=id=>document.getElementById(id).value;
    if(!document.getElementById('capConfirm').checked){alert('Please confirm that the information is correct.');return;}
    const operator=personnelCache.find(p=>p.id===val('capOperator')), supervisor=personnelCache.find(p=>p.id===val('capSupervisor'));
    const payload={
      company_id:activeCompanyId,
      production_date:val('capDate'),
      shift_id:val('capShift')||null,
      lot_number:val('capLot').trim(),
      customer_id:val('capCustomer')||null,
      part_number_id:val('capPN')||null,
      machine_id:val('capMachine')||null,
      operation_id:val('capOperation')||null,
      operator_id:operator?.id||null,
      supervisor_id:supervisor?.id||null,
      operator_name:operator?`${personnelFullName(operator)} (${operator.employee_id})`:null,
      supervisor_name:supervisor?`${personnelFullName(supervisor)} (${supervisor.employee_id})`:null,
      production_quantity:Number(val('capQty')),
      confirmed:true,
      confirmed_at:new Date().toISOString()
    };
    const required=['shift_id','lot_number','customer_id','part_number_id','machine_id','operation_id','production_quantity'];
    const missing=required.filter(k=>payload[k]===null||payload[k]===''||Number.isNaN(payload[k]));
    if(missing.length){alert('Please complete all required production information.');return;}
    const {error}=await sb.from('production_captures').insert(payload);
    if(error){console.error(error);alert(error.message);return;}
    alert('Production capture saved successfully.');
    await renderCaptureFoundation();
  };
}
