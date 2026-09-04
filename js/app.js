const cfg=window.GUVEL_CONFIG;let sb=null;
if(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY) sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const navItems=['Dashboard','Capture','Customers','Part Numbers','Machines','Catalog','Registers','Settings'];
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
  body.innerHTML=pnCache.map(p=>`<tr><td><button class="link-button openPn" data-id="${p.id}">${escapeHtml(p.part_number)}</button></td><td>${escapeHtml(p.customers?`${p.customers.code} — ${p.customers.name}`:'')}</td><td>${escapeHtml(p.description||'')}</td><td>${formatMoney(p.piece_cost)}</td><td>${formatMoney(p.scrap_cost)}</td><td><button class="secondary editPn" data-id="${p.id}">Edit</button> <button class="danger deletePn" data-id="${p.id}">Delete</button></td></tr>`).join('');
  document.querySelectorAll('.openPn').forEach(b=>b.onclick=()=>openPnProfile(b.dataset.id));
  document.querySelectorAll('.editPn').forEach(b=>b.onclick=()=>startPnEdit(pnCache.find(x=>x.id===b.dataset.id)));
  document.querySelectorAll('.deletePn').forEach(b=>b.onclick=()=>deletePn(b.dataset.id));
}
function formatMoney(v){if(v===null||v===undefined||v==='')return '—';return Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6});}
function openPnProfile(id){
  const p=pnCache.find(x=>x.id===id);if(!p)return;
  const panel=document.getElementById('pnProfilePanel'), content=document.getElementById('pnProfileContent');
  content.innerHTML=`<div class="profile-grid">
    <div><strong>Part Number</strong><span>${escapeHtml(p.part_number)}</span></div>
    <div><strong>Customer</strong><span>${escapeHtml(p.customers?`${p.customers.code} — ${p.customers.name}`:'')}</span></div>
    <div><strong>Description</strong><span>${escapeHtml(p.description||'—')}</span></div>
    <div><strong>Cost per Piece</strong><span>${formatMoney(p.piece_cost)}</span></div>
    <div><strong>Scrap Cost</strong><span>${formatMoney(p.scrap_cost)}</span></div>
    <div><strong>Company Scope</strong><span>Active company only</span></div>
  </div>
  <div class="profile-next"><strong>Reserved next links:</strong> Operations → Machines → Cycle Time → Defects. No new relationship is created in this phase.</div>`;
  panel.style.display='block';panel.scrollIntoView({behavior:'smooth',block:'start'});
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

function page(){switch(current){case'Dashboard':return dashboard();case'Capture':return capture();case'Customers':return customersPage();case'Part Numbers':return partNumbersPage();case'Machines':return table('Machines',['Brand','Code','Name','Linked Part Numbers']);case'Catalog':return table('Catalog',['Type','Code','Name / Defect','Category','Part Number','Operation']);case'Registers':return table('Registers',['Production / Scrap / Downtime','Date / Time','Shift','Lot / Event','Part Number','Quantity / Minutes']);case'Settings':return shiftsPage();}}
function render(){view.innerHTML=page();if(current==='Dashboard'){dashTab('General');document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');dashTab(b.dataset.tab);});}if(current==='Settings')bindShifts();if(current==='Customers')bindCustomers();if(current==='Part Numbers')bindPartNumbers();}
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
