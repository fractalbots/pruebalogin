// --- supabase setup ---------------------------------------------------------
const SUPA_URL = 'https://upytqftigginepncmoth.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVweXRxZnRpZ2dpbmVwbmNtb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzA5ODQsImV4cCI6MjA4OTA0Njk4NH0.3NonScZQ3UHdYRuiGRFctco-EWYaW32-A375Lqk33Xs';
const { createClient } = window.supabase;
const sb = createClient(SUPA_URL, SUPA_KEY);

// --- ROUTE GUARD -----------------------------------------------------------
(async function() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const { data: roles } = await sb.from('user_roles').select('rol').eq('user_id', session.user.id);
  if (!roles || !roles.some(r => r.rol === 'admin')) { window.location.href = 'index.html'; return; }

  const { data: profile } = await sb.from('profiles').select('nombres,apellidos').eq('id', session.user.id).single();
  if (profile) {
    const name = profile.nombres + ' ' + profile.apellidos;
    document.querySelectorAll('.admin-name, [data-admin-name]').forEach(el => el.textContent = name);
    const initials = (profile.nombres[0] + profile.apellidos[0]).toUpperCase();
    document.querySelectorAll('.avatar, [data-admin-initials]').forEach(el => el.textContent = initials);
  }
})();

async function cerrarSesion() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

/* ─── DATE ─── */
(function(){
  const d = new Date();
  const opts = {weekday:'long',year:'numeric',month:'long',day:'numeric'};
  document.getElementById('topbar-date').textContent = d.toLocaleDateString('es-EC',opts);
})();

/* ─── NAVIGATION ─── */
function showSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  if (el) el.classList.add('active');
  const titles = {
    dashboard:'Dashboard', docentes:'Docentes', estudiantes:'Estudiantes',
    calificaciones:'Calificaciones', noticias:'Noticias', cursos:'Cursos & Materias',
    asistencia:'Asistencia', 'control-notas':'Control de Notas'
  };
  document.getElementById('page-title').textContent = titles[id] || id;
  document.getElementById('breadcrumb-current').textContent = titles[id] || id;
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

/* ─── MODAL TABS ─── */
function switchModalTab(tabId, btn) {
  document.querySelectorAll('.modal-tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  btn.classList.add('active');
}

/* ─── BUILD ASSIGNMENT MATRIX ─── */
(function(){
  const materias = ['Matemáticas','Lengua y Literatura','Ciencias Naturales','Historia y CCSS','Inglés','Robótica / Tecnología','Ed. Física','Emprendimiento'];
  const tbody = document.getElementById('matrix-tbody');
  if (!tbody) return;
  materias.forEach((mat) => {
    const tr = document.createElement('tr');
    let html = `<td class="subject-name">${mat}</td>`;
    for (let ci = 0; ci < 7; ci++) {
      html += `<td><input type="checkbox" class="matrix-cb"/></td>`;
    }
    tr.innerHTML = html;
    tbody.appendChild(tr);
  });
})();

/* ─── CONTROL DE NOTAS ─── */
function masterToggle(trim, cb) {
  document.querySelectorAll('.cb-'+trim).forEach(c => { c.checked = cb.checked; });
  updateTrimBadge(trim);
}
function updateTrimBadge(trim) {
  const cbs   = document.querySelectorAll('.cb-'+trim);
  const total  = cbs.length;
  const active = [...cbs].filter(c => c.checked).length;
  const badge  = document.getElementById('badge-'+trim);
  const card   = document.getElementById('card-'+trim);
  if (active === 0) {
    badge.textContent = 'CERRADO'; badge.className = 'trim-badge closed';
    card.classList.remove('active-trim');
  } else if (active === total) {
    badge.textContent = 'ABIERTO'; badge.className = 'trim-badge open';
    card.classList.add('active-trim');
  } else {
    badge.textContent = active+'/'+total+' CURSOS'; badge.className = 'trim-badge future';
    card.classList.add('active-trim');
  }
}
function setAllToggles(state) {
  ['t1','t2','t3'].forEach(trim => {
    document.querySelectorAll('.cb-'+trim).forEach(c => c.checked = state);
    const master = document.querySelector('#card-'+trim+' .master-toggle-row input[type=checkbox]');
    if (master) master.checked = state;
    updateTrimBadge(trim);
  });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ─── MODAL ─── */
function openModal(id, title) {
  document.getElementById(id).classList.add('open');
  const t = document.getElementById(id+'-title');
  if (t) t.textContent = title;
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

/* ─── FILTER BY CURSO ─── */
function filterByCurso(val) {
  const tbl = document.getElementById('estudiantes-table');
  if (!tbl) return;
  tbl.querySelectorAll('tbody tr').forEach(row => {
    row.style.display = (!val || row.textContent.includes(val)) ? '' : 'none';
  });
}

/* ─── TABLE FILTER ─── */
function filterTable(tableId, q) {
  const tbl = document.getElementById(tableId);
  if (!tbl) return;
  q = q.toLowerCase();
  tbl.querySelectorAll('tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

/* ─── GRADES DATA ─── */
const students = [
  ['Valentina Torres','8vo A'],[' Santiago Cárdenas','8vo A'],['Isabella Ramírez','8vo A'],
  ['Diego Molina','8vo A'],['Ariana Vargas','8vo A'],['Mateo Herrera','8vo A'],
  ['Camila Jiménez','8vo A'],['Sebastián Mora','8vo A'],['Lucía Paredes','8vo A'],
  ['Emilio Suárez','8vo A'],['Valeria Castro','8vo A'],['Andrés Benítez','8vo A'],
  ['Sofía Ríos','8vo A'],['Nicolás León','8vo A'],['Daniela Flores','8vo A'],['Tomás Aguirre','8vo A']
];

const colors = ['red','gold','dark'];
let currentTrimestre = 1;

function randGrade(min=5.5, max=10){
  return +(min + Math.random()*(max-min)).toFixed(2);
}
function gradeClass(g){
  if(!g) return 'grade-empty';
  if(g >= 7) return 'grade-pass';
  if(g >= 5) return 'grade-sup';
  return 'grade-fail';
}

function renderGrades(){
  const tbody = document.getElementById('grades-tbody');
  tbody.innerHTML = '';
  students.forEach((s,i) => {
    const grades = [
      randGrade(5,10), randGrade(5,10), randGrade(5,10), randGrade(5,10),
      randGrade(5,10), randGrade(5,10), randGrade(5,10)
    ];
    const avg = +(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(2);
    const approved = avg >= 7;
    const initials = s[0].trim().split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const colors = ['red','gold','dark'];
    const col = colors[i%3];
    tbody.innerHTML += `
      <tr>
        <td style="color:var(--text3);font-size:0.78rem">${i+1}</td>
        <td><div class="avatar-cell"><div class="mini-avatar ${col}">${initials}</div><div class="cell-name">${s[0].trim()}</div></div></td>
        ${grades.map(g=>`<td class="grade-cell"><span class="${gradeClass(g)}">${g}</span></td>`).join('')}
        <td class="final-cell ${approved?'grade-pass':'grade-sup'}">${avg}
          ${approved
            ? '<span class="approved-tag">OK</span>'
            : '<span class="sup-tag">SUPLETORIO</span>'}
        </td>
        <td>${approved
          ? '<span class="badge badge-green">Aprobado</span>'
          : '<span class="badge badge-gold">Supletorio</span>'}</td>
      </tr>`;
  });
}
renderGrades();

function setTrimestre(n, btn){
  currentTrimestre = n;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderGrades();
  const labels = {0:'Vista General',1:'Trimestre 1',2:'Trimestre 2',3:'Trimestre 3'};
  document.getElementById('grade-summary').innerHTML =
    `Curso: <b>8vo "A"</b> — ${labels[n]} — ${students.length} estudiantes`;
}

/* ─── EXPORT PDF ─── */
function exportPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });

  // Header
  doc.setFillColor(30, 30, 46);
  doc.rect(0, 0, 297, 28, 'F');
  doc.setTextColor(240, 201, 106);
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.text('COLEGIO PARTICULAR MIXTO "CHARLES BABBAGE"', 148, 10, {align:'center'});
  doc.setFontSize(10);
  doc.setTextColor(200,180,120);
  doc.text('Registro de Calificaciones — ' + (currentTrimestre===0?'Vista General':'Trimestre '+currentTrimestre), 148, 18, {align:'center'});
  doc.setFontSize(8);
  doc.setTextColor(150,140,120);
  doc.text('Sangolquí, Rumiñahui — Período Lectivo 2025–2026', 148, 24, {align:'center'});

  // Table
  const rows = [];
  document.querySelectorAll('#grades-tbody tr').forEach((tr,i) => {
    const cells = tr.querySelectorAll('td');
    rows.push([
      i+1,
      cells[1].querySelector('.cell-name')?.textContent?.trim() || '',
      cells[2].textContent.trim(), cells[3].textContent.trim(),
      cells[4].textContent.trim(), cells[5].textContent.trim(),
      cells[6].textContent.trim(), cells[7].textContent.trim(),
      cells[8].textContent.trim(), cells[9].textContent.trim(),
      cells[10].textContent.trim()
    ]);
  });

  doc.autoTable({
    startY: 32,
    head:[['#','Estudiante','Matemáticas','Lengua','CC.NN.','Historia','Inglés','Robótica','Ed. Física','Promedio','Estado']],
    body: rows,
    styles: { fontSize:8, cellPadding:3, font:'helvetica' },
    headStyles: { fillColor:[155,22,38], textColor:255, fontStyle:'bold', halign:'center' },
    bodyStyles: { textColor:[26,26,46] },
    alternateRowStyles: { fillColor:[247,246,243] },
    columnStyles: {
      0:{halign:'center',cellWidth:8},
      2:{halign:'center'},3:{halign:'center'},4:{halign:'center'},
      5:{halign:'center'},6:{halign:'center'},7:{halign:'center'},
      8:{halign:'center'},9:{halign:'center',fontStyle:'bold'},10:{halign:'center'}
    },
    didParseCell(data){
      if(data.section==='body'){
        const v = parseFloat(data.cell.raw);
        if(!isNaN(v)){
          if(v < 7) data.cell.styles.textColor = [196,130,0];
          else data.cell.styles.textColor = [22,120,60];
        }
              if(data.column.index===10){
          const txt = String(data.cell.raw);
          if(txt.includes('Supletorio')) data.cell.styles.textColor=[180,100,0];
          else data.cell.styles.textColor=[22,120,60];
        }
      }
    },
    foot:[['','','','','','','','','Leyenda: Aprobado >= 7.00  |  Supletorio < 7.00','','']],
    footStyles:{ fillColor:[240,230,210], textColor:[100,80,40], fontSize:7 }
  });

  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(7); doc.setTextColor(160,150,140);
  doc.text('Generado: ' + new Date().toLocaleString('es-EC') + '  |  Sistema Academico Charles Babbage', 148, pageH-6, {align:'center'});
  doc.save('calificaciones_T' + currentTrimestre + '_charlesbabbage.pdf');
}
