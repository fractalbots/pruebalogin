const SUPA_URL = 'https://upytqftigginepncmoth.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVweXRxZnRpZ2dpbmVwbmNtb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzA5ODQsImV4cCI6MjA4OTA0Njk4NH0.3NonScZQ3UHdYRuiGRFctco-EWYaW32-A375Lqk33Xs';
const { createClient } = window.supabase;
const sb = createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let currentProfile = null;

(async function() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const { data: roles } = await sb.from('user_roles').select('rol').eq('user_id', session.user.id);
  if (!roles || !roles.some(r => r.rol === 'docente' || r.rol === 'admin')) { window.location.href = 'index.html'; return; }

  currentUser = session.user;

  const { data: profile } = await sb.from('profiles').select('nombres,apellidos,cedula').eq('id', session.user.id).single();
  if (profile) {
    currentProfile = profile;
    const fullName = profile.nombres + ' ' + profile.apellidos;
    const initials = profile.nombres.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() +
                     profile.apellidos.split(' ').map(n=>n[0]).join('').slice(0,1).toUpperCase();
    document.querySelector('.dc-name').textContent = 'Lic. ' + fullName;
    document.querySelector('.avatar').textContent = initials.slice(0,2);
    document.querySelector('[title="Laura Martínez"]').textContent = initials.slice(0,2);
    document.querySelector('[title="Laura Martínez"]').title = fullName;
    // Update sidebar initials and welcome text
    document.querySelectorAll('[title*="Martínez"]').forEach(el => { el.textContent = initials.slice(0,2); el.title = fullName; });
  }
})();

async function cerrarSesion() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

/* ─── DATE ─── */
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('es-EC',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

/* ─── NAVIGATION ─── */
function showSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  if (el) el.classList.add('active');
  const titles = { dashboard:'Dashboard', notas:'Registro de Notas', historial:'Historial' };
  document.getElementById('page-title').textContent = titles[id] || id;
  document.getElementById('breadcrumb-current').textContent = titles[id] || id;
  if (id === 'historial') renderHistorial(1);
}

function selectMateria(m, el) {
  document.querySelectorAll('.materia-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  showSection('notas', document.querySelector('[onclick*="notas"]'));
}

function goToNotas(curso) {
  document.getElementById('sel-curso').value = curso;
  showSection('notas', document.querySelector('[onclick*="notas"]'));
  refreshTable();
}

/* ─── STUDENTS DATA ─── */
const STUDENTS = {
  '8A':  [['Valentina Torres','1750123456'],['Santiago Cárdenas','1720987654'],['Isabella Ramírez','1745678901'],['Diego Molina','1730456789'],['Ariana Vargas','1762345678'],['Mateo Herrera','1748901234'],['Camila Jiménez','1735678901'],['Sebastián Mora','1758234567'],['Lucía Paredes','1742109876'],['Emilio Suárez','1768901234'],['Valeria Castro','1725678901'],['Andrés Benítez','1752345678'],['Sofía Ríos','1737890123'],['Nicolás León','1764567890'],['Daniela Flores','1741234567'],['Tomás Aguirre','1729876543']],
  '9A':  [['Carlos Peña','1751234567'],['Andrea Loor','1721098765'],['Fernando Mora','1746789012'],['Gabriela Núñez','1731567890'],['Rodrigo Castro','1763456789'],['Melissa Reyes','1749012345'],['Pablo Torres','1736789012'],['Diana Ortiz','1759345678'],['Juan Salazar','1743210987'],['Sara Vega','1769012345'],['Miguel Flores','1726789012'],['Luciana Díaz','1753456789'],['Andrés Medina','1738901234'],['Camilo Ramos','1765678901'],['Valeria Mora','1742345678'],['Esteban Ríos','1730987654'],['Paula López','1760123456'],['Cristian Herrera','1747890123']],
  '10A': [['Ricardo Álvarez','1752345678'],['Melissa Guerrero','1722109876'],['Alejandro Paz','1747890123'],['Natalia Soto','1732678901'],['Sebastián Cruz','1764567890'],['Daniela Mera','1750123456'],['Felipe Vargas','1737890123'],['Sofía Carrillo','1760234567'],['Martín Espín','1744321098'],['Valentina Mora','1770123456'],['Bruno Almeida','1727890123'],['Karla Ramos','1754567890'],['Emilio Torres','1739012345']],
  '3BGU':[['Alejandra Vega','1753456789'],['Javier Rosero','1723210987'],['Paola Cevallos','1748901234'],['Marco Freire','1733789012'],['Camila Intriago','1765678901'],['Sebastián Muñoz','1751234567'],['Fernanda Aguilar','1738901234'],['Nicolás Pinto','1761345678'],['Valeria Granda','1745432109'],['Diego Jarrín','1771234567'],['Priscila Benítez','1728901234'],['Andrés Quiñónez','1755678901'],['Sofía Enríquez','1740123456'],['Luis Barriga','1766789012'],['María Ortega','1743210987'],['Tomás Carrasco','1730123456']]
};

const colors = ['red','gold','dark'];
let savedData = {}; // { 'trim-curso': { studentIdx: [i1,i2,i3,i4,prueba] } }

/* ─── BUILD TABLE ─── */
function refreshTable() {
  const curso = document.getElementById('sel-curso').value;
  const trim  = document.getElementById('sel-trim').value;
  const key   = trim + '-' + curso;
  const cursoNames = {'8A':'8vo "A"','9A':'9no "A"','10A':'10mo "A"','3BGU':'3ro BGU'};

  document.getElementById('ta-curso').textContent   = cursoNames[curso];
  document.getElementById('ta-materia').textContent = 'Matemáticas';
  document.getElementById('ta-count').textContent   = (STUDENTS[curso]||[]).length + ' estudiantes';

  // Simulated lock state: T1 locked, T2 open (except 3BGU row 5+6 as demo), T3 locked
  const isLocked = trim === '1' || trim === '3';
  document.getElementById('locked-banner').classList.toggle('show', isLocked);
  document.getElementById('open-banner').classList.toggle('show', !isLocked);
  document.getElementById('btn-save').disabled = isLocked;
  document.querySelector('.btn-gold').disabled  = isLocked;

  const students = STUDENTS[curso] || [];
  const tbody    = document.getElementById('notas-tbody');
  tbody.innerHTML = '';

  students.forEach((s, i) => {
    const initials = s[0].trim().split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const col      = colors[i % 3];
    const saved    = (savedData[key] && savedData[key][i]) ? savedData[key][i] : [null,null,null,null,null];

    const tr = document.createElement('tr');
    tr.id = 'row-'+i;

    let cells = `<td class="td-student">
      <div class="student-cell">
        <div class="mini-avatar ${col}">${initials}</div>
        <div><div class="cell-name">${s[0]}</div><div class="cell-cedula">${s[1]}</div></div>
      </div></td>`;

    // 4 insumos + 1 prueba
    for (let c = 0; c < 5; c++) {
      const v   = saved[c] !== null ? saved[c] : '';
      const cls = c < 4 ? 'th-insumo-inp' : 'th-prueba-inp';
      cells += `<td style="text-align:center">
        <input class="grade-input ${cls}" type="number" min="0" max="10" step="0.01"
          data-row="${i}" data-col="${c}" value="${v}"
          ${isLocked ? 'disabled' : ''}
          oninput="calcRow(${i})" onblur="validateInput(this)"/>
      </td>`;
    }

    // calculated cols (read-only)
    cells += `<td class="calc-cell empty" id="c-tn-${i}">—</td>`;
    cells += `<td class="calc-cell empty" id="c-pr-${i}">—</td>`;
    cells += `<td class="total-cell" id="c-tot-${i}"><span class="total-badge empty">—</span></td>`;

    tr.innerHTML = cells;
    tbody.appendChild(tr);

    // re-calc if we have saved values
    if (saved.some(v => v !== null)) calcRow(i);
  });

  updateSuperletorioCount();
}

/* ─── CALCULATE ROW ─── */
function calcRow(rowIdx) {
  const inputs = document.querySelectorAll(`input[data-row="${rowIdx}"]`);
  const vals   = [...inputs].map(inp => inp.value === '' ? null : parseFloat(inp.value));

  // validate range
  inputs.forEach(inp => {
    const v = parseFloat(inp.value);
    inp.classList.toggle('invalid', inp.value !== '' && (isNaN(v) || v < 0 || v > 10));
  });

  const [i1, i2, i3, i4, prueba] = vals;
  const allInsumos = [i1, i2, i3, i4].every(v => v !== null);
  const hasPrueba  = prueba !== null;

  const tnCell  = document.getElementById('c-tn-'+rowIdx);
  const prCell  = document.getElementById('c-pr-'+rowIdx);
  const totCell = document.getElementById('c-tot-'+rowIdx);

  if (allInsumos) {
    const promInsumos = (i1 + i2 + i3 + i4) / 4;
    const tn = +(promInsumos * 0.8).toFixed(2);
    tnCell.textContent = tn.toFixed(2);
    tnCell.className   = 'calc-cell ' + gradeClass(promInsumos);

    if (hasPrueba) {
      const pr  = +(prueba * 0.2).toFixed(2);
      const tot = +(tn + pr).toFixed(2);
      prCell.textContent = pr.toFixed(2);
      prCell.className   = 'calc-cell ' + gradeClass(prueba);

      const statusClass = tot >= 7 ? 'pass' : 'sup';
      const statusText  = tot >= 7 ? '✓ ' + tot.toFixed(2) : '⚠ ' + tot.toFixed(2);
      totCell.innerHTML = `<span class="total-badge ${statusClass}">${statusText}</span>`;
    } else {
      prCell.textContent = '—';
      prCell.className   = 'calc-cell empty';
      totCell.innerHTML  = '<span class="total-badge empty">Falta prueba</span>';
    }
  } else {
    tnCell.textContent = '—'; tnCell.className = 'calc-cell empty';
    prCell.textContent = '—'; prCell.className = 'calc-cell empty';
    totCell.innerHTML  = '<span class="total-badge empty">—</span>';
  }

  updateSuperletorioCount();
}

function gradeClass(g) {
  if (g >= 7) return 'pass';
  if (g >= 5) return 'sup';
  return 'fail';
}

function validateInput(inp) {
  const v = parseFloat(inp.value);
  if (inp.value !== '' && (isNaN(v) || v < 0 || v > 10)) {
    inp.value = '';
    inp.classList.add('invalid');
  } else {
    inp.classList.remove('invalid');
  }
}

function updateSuperletorioCount() {
  const sups = document.querySelectorAll('.total-badge.sup').length;
  document.getElementById('ta-sup').textContent = sups;
}

/* ─── SAVE ─── */
function saveNotas() {
  const curso = document.getElementById('sel-curso').value;
  const trim  = document.getElementById('sel-trim').value;
  const key   = trim + '-' + curso;
  savedData[key] = {};

  document.querySelectorAll('#notas-tbody tr').forEach((tr, i) => {
    const inputs = tr.querySelectorAll('input');
    savedData[key][i] = [...inputs].map(inp => inp.value === '' ? null : parseFloat(inp.value));
  });

  // Show success
  const prog = document.getElementById('save-progress');
  prog.classList.add('show');
  setTimeout(() => prog.classList.remove('show'), 3000);
}

/* ─── CLEAR ─── */
function clearAll() {
  if (!confirm('¿Limpiar todas las notas de esta vista?')) return;
  document.querySelectorAll('#notas-tbody input').forEach(inp => { inp.value = ''; inp.classList.remove('invalid'); });
  document.querySelectorAll('[id^="c-"]').forEach(cell => {
    if (cell.tagName === 'TD') {
      if (cell.id.startsWith('c-tot')) cell.innerHTML = '<span class="total-badge empty">—</span>';
      else { cell.textContent = '—'; cell.className = 'calc-cell empty'; }
    }
  });
  updateSuperletorioCount();
}

/* ─── EXPORT PDF ─── */
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const curso = document.getElementById('sel-curso').value;
  const trim  = document.getElementById('sel-trim').value;
  const cursoNames = {'8A':'8vo A','9A':'9no A','10A':'10mo A','3BGU':'3ro BGU'};
  const doc   = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });

  doc.setFillColor(30,30,46);
  doc.rect(0,0,297,28,'F');
  doc.setTextColor(240,201,106); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('COLEGIO PARTICULAR MIXTO "CHARLES BABBAGE"',148,10,{align:'center'});
  doc.setFontSize(9); doc.setTextColor(200,180,120);
  doc.text(`Calificaciones — Matemáticas — ${cursoNames[curso]} — Trimestre ${trim}`,148,18,{align:'center'});
  doc.setFontSize(7); doc.setTextColor(150,150,140);
  doc.text('Docente: Lic. Laura Martínez   |   Período Lectivo 2025–2026   |   Sangolquí, Rumiñahui',148,24,{align:'center'});

  const rows = [];
  document.querySelectorAll('#notas-tbody tr').forEach((tr,i) => {
    const name  = tr.querySelector('.cell-name')?.textContent?.trim() || '';
    const inps  = [...tr.querySelectorAll('input')].map(i => i.value || '—');
    const tn    = document.getElementById('c-tn-'+i)?.textContent?.trim() || '—';
    const pr    = document.getElementById('c-pr-'+i)?.textContent?.trim() || '—';
    const totEl = document.getElementById('c-tot-'+i)?.querySelector('.total-badge');
    const tot   = totEl ? totEl.textContent.replace('✓','').replace('⚠','').trim() : '—';
    const est   = totEl ? (totEl.classList.contains('pass') ? 'Aprobado' : totEl.classList.contains('sup') ? 'Supletorio' : '—') : '—';
    rows.push([i+1, name, inps[0], inps[1], inps[2], inps[3], inps[4], tn, pr, tot, est]);
  });

  doc.autoTable({
    startY:32,
    head:[['#','Estudiante','Insumo 1','Insumo 2','Insumo 3','Insumo 4','Prueba','T.Notas 80%','Prueba 20%','Total Parcial','Estado']],
    body: rows,
    styles:{ fontSize:7.5, cellPadding:2.5, font:'helvetica' },
    headStyles:{ fillColor:[155,22,38], textColor:255, fontStyle:'bold', halign:'center' },
    bodyStyles:{ textColor:[26,26,46] },
    alternateRowStyles:{ fillColor:[247,246,243] },
    columnStyles:{
      0:{halign:'center',cellWidth:8}, 2:{halign:'center'}, 3:{halign:'center'},
      4:{halign:'center'}, 5:{halign:'center'}, 6:{halign:'center',fillColor:[255,245,245]},
      7:{halign:'center'}, 8:{halign:'center'}, 9:{halign:'center',fontStyle:'bold'}, 10:{halign:'center'}
    },
    didParseCell(data){
      if(data.section==='body' && data.column.index >= 2 && data.column.index <= 9){
        const v = parseFloat(data.cell.raw);
        if(!isNaN(v)){
          data.cell.styles.textColor = v < 7 ? [180,100,0] : [22,120,60];
        }
      }
      if(data.section==='body' && data.column.index===10){
        if(String(data.cell.raw).includes('Supletorio')) data.cell.styles.textColor=[180,100,0];
        else if(String(data.cell.raw).includes('Aprobado')) data.cell.styles.textColor=[22,120,60];
      }
    },
    foot:[['','','','','','','Fórmula: (Prom. Insumos × 0.80) + (Prueba × 0.20) = Total Parcial   |   Aprobado ≥ 7.00','','','','']],
    footStyles:{fillColor:[240,230,210],textColor:[100,80,40],fontSize:6.5}
  });

  const pH = doc.internal.pageSize.height;
  doc.setFontSize(6.5); doc.setTextColor(160,150,140);
  doc.text(`Generado: ${new Date().toLocaleString('es-EC')}  |  Sistema Academico Charles Babbage`,148,pH-5,{align:'center'});
  doc.save(`notas_matematicas_${cursoNames[curso].replace(' ','')}_T${trim}.pdf`);
}

/* ─── HISTORIAL ─── */
function setHistTrim(t, btn) {
  document.querySelectorAll('.trim-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistorial(t);
}

function renderHistorial(trim) {
  const grid = document.getElementById('historial-grid');
  const cursos = [
    {id:'8A',name:'8vo "A"',total:16},
    {id:'9A',name:'9no "A"',total:18},
    {id:'10A',name:'10mo "A"',total:14},
    {id:'3BGU',name:'3ro BGU',total:16}
  ];
  grid.innerHTML = '';
  cursos.forEach(c => {
    const aprobados  = trim === 2 ? Math.floor(c.total * 0.87) : trim === 1 ? Math.floor(c.total * 0.75) : 0;
    const suplTorios = trim === 2 ? c.total - aprobados : trim === 1 ? c.total - aprobados : 0;
    const pct = c.total > 0 ? Math.round((aprobados/c.total)*100) : 0;
    const status = trim === 3 ? 'badge-gray' : trim === 1 ? 'badge-gold' : 'badge-green';
    const statusTxt = trim === 3 ? 'No iniciado' : trim === 1 ? 'Cerrado' : 'Abierto';

    grid.innerHTML += `
      <div class="historial-card">
        <div class="hc-title">
          Matemáticas — ${c.name}
          <span class="badge ${status}">${statusTxt}</span>
        </div>
        <div class="hc-stat"><span>Total estudiantes</span><b>${c.total}</b></div>
        <div class="hc-stat"><span>Aprobados</span><b style="color:var(--green)">${trim===3?'—':aprobados}</b></div>
        <div class="hc-stat"><span>Supletorio</span><b style="color:var(--orange)">${trim===3?'—':suplTorios}</b></div>
        <div class="hc-stat"><span>% aprobación</span><b>${trim===3?'—':pct+'%'}</b></div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${trim===3?0:pct}%;background:${pct>=80?'var(--green)':pct>=60?'var(--orange)':'var(--red)'}"></div>
        </div>
        ${trim!==3?`<button class="btn btn-outline" style="width:100%;margin-top:12px;font-size:0.75rem" onclick="goToNotas('${c.id}')">Ver notas completas →</button>`:''}
      </div>`;
  });
}

/* ─── INIT ─── */
refreshTable();