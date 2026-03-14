const { createClient } = window.supabase;

const supabaseUrl = 'https://upytqftigginepncmoth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVweXRxZnRpZ2dpbmVwbmNtb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzA5ODQsImV4cCI6MjA4OTA0Njk4NH0.3NonScZQ3UHdYRuiGRFctco-EWYaW32-A375Lqk33Xs';
const supabase = createClient(supabaseUrl, supabaseKey);

let user = null;
let userRole = null;
let userProfile = null;

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  user = session.user;
  await loadUserProfile();
  await loadDashboard();
}

async function loadUserProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error loading profile:', error);
    return;
  }

  userProfile = data;
  userRole = data.role;

  // Check role access
  if (userRole !== 'estudiante' && userRole !== 'admin') {
    alert('Acceso denegado. Solo estudiantes pueden acceder a esta página.');
    window.location.href = 'index.html';
    return;
  }

  // Update UI
  document.querySelector('.sp-name').textContent = `${userProfile.nombre} ${userProfile.apellido}`;
  document.querySelector('.sp-cedula').textContent = `Cédula: ${userProfile.cedula}`;
  document.querySelector('.sp-avatar').textContent = userProfile.nombre.charAt(0).toUpperCase() + userProfile.apellido.charAt(0).toUpperCase();
  document.querySelector('.sp-badge.curso').textContent = userProfile.curso || 'Sin curso';
  document.querySelector('.sp-badge.year').textContent = userProfile.year || 'Sin año';

  document.querySelector('.wb-greeting span').textContent = userProfile.nombre;
}

async function loadDashboard() {
  await loadGrades();
  updateDate();
}

async function loadGrades() {
  try {
    const { data: grades, error } = await supabase
      .from('calificaciones')
      .select(`
        *,
        materia:materias(nombre, profesor_id),
        profesor:profiles!materias_profesor_id_fkey(nombre, apellido)
      `)
      .eq('estudiante_id', user.id)
      .order('materia_id', { ascending: true });

    if (error) {
      console.error('Error loading grades:', error);
      return;
    }

    // Group by materia
    const groupedGrades = {};
    grades.forEach(grade => {
      if (!groupedGrades[grade.materia_id]) {
        groupedGrades[grade.materia_id] = {
          materia: grade.materia,
          profesor: grade.profesor,
          calificaciones: []
        };
      }
      groupedGrades[grade.materia_id].calificaciones.push(grade);
    });

    renderGradesTable(groupedGrades);
    updateAlerts(grades);
  } catch (error) {
    console.error('Error in loadGrades:', error);
  }
}

function renderGradesTable(groupedGrades) {
  const tbody = document.querySelector('.main-table tbody');
  tbody.innerHTML = '';

  Object.entries(groupedGrades).forEach(([materiaId, data]) => {
    const row = createMateriaRow(materiaId, data);
    tbody.appendChild(row);

    const detailRow = createDetailRow(materiaId, data);
    tbody.appendChild(detailRow);
  });
}

function createMateriaRow(materiaId, data) {
  const row = document.createElement('tr');
  row.className = 'materia-row';
  row.dataset.materiaId = materiaId;

  const materiaCell = document.createElement('td');
  materiaCell.colSpan = 5; // materia + 3 trims + prom
  materiaCell.innerHTML = `
    <div class="materia-cell-inner">
      <div class="materia-icon" style="background: linear-gradient(135deg, var(--red), var(--red2));">
        📚
      </div>
      <div class="materia-info">
        <div class="materia-name">${data.materia.nombre}</div>
        <div class="materia-profe">
          <span class="profe-dot"></span>
          ${data.profesor.nombre} ${data.profesor.apellido}
        </div>
      </div>
      <div class="expand-arrow">▶</div>
    </div>
  `;

  row.appendChild(materiaCell);

  // Calculate trim scores
  const trims = [1, 2, 3];
  trims.forEach(trim => {
    const trimGrades = data.calificaciones.filter(g => g.trimestre === trim);
    const avg = calculateTrimAverage(trimGrades);
    const cell = document.createElement('td');
    cell.className = 'trim-cell';
    cell.innerHTML = `
      <div class="trim-score ${getScoreClass(avg)}">
        <div class="ts-num">${avg || '--'}</div>
        <div class="ts-lbl">Trim ${trim}</div>
      </div>
    `;
    row.appendChild(cell);
  });

  // Promedio final
  const finalAvg = calculateFinalAverage(data.calificaciones);
  const promCell = document.createElement('td');
  promCell.className = 'prom-cell';
  promCell.innerHTML = `
    <div class="prom-badge ${getScoreClass(finalAvg)}">
      <div class="pb-num">${finalAvg || '--'}</div>
      <div class="pb-lbl">Promedio</div>
    </div>
  `;
  row.appendChild(promCell);

  // Add click handler
  row.addEventListener('click', () => toggleDetail(row, materiaId));

  return row;
}

function createDetailRow(materiaId, data) {
  const row = document.createElement('tr');
  row.className = 'detail-row';
  row.dataset.materiaId = materiaId;

  const cell = document.createElement('td');
  cell.colSpan = 6; // full width
  cell.innerHTML = `
    <div class="detail-inner">
      <div class="profe-chip">
        <div class="pc-avatar">${data.profesor.nombre.charAt(0).toUpperCase()}${data.profesor.apellido.charAt(0).toUpperCase()}</div>
        <strong>${data.profesor.nombre} ${data.profesor.apellido}</strong>
      </div>
      <div class="detail-grid">
        ${[1, 2, 3].map(trim => createTrimDetailCard(trim, data.calificaciones.filter(g => g.trimestre === trim))).join('')}
      </div>
    </div>
  `;

  row.appendChild(cell);
  return row;
}

function createTrimDetailCard(trim, grades) {
  const avg = calculateTrimAverage(grades);
  const status = getTrimStatus(trim, grades);
  const formula = getFormulaText(grades);

  return `
    <div class="trim-detail-card">
      <div class="tdc-header">
        <div class="tdc-title">Trimestre ${trim}</div>
        <div class="tdc-status ${status.class}">${status.text}</div>
      </div>
      <div class="tdc-body">
        <div class="tdc-row">
          <span class="tr-label">Trabajos</span>
          <span class="tr-val ${getScoreClass(grades.find(g => g.tipo === 'trabajos')?.nota || 0)}">${grades.find(g => g.tipo === 'trabajos')?.nota || '--'}</span>
        </div>
        <div class="tdc-row">
          <span class="tr-label">Examen</span>
          <span class="tr-val ${getScoreClass(grades.find(g => g.tipo === 'examen')?.nota || 0)}">${grades.find(g => g.tipo === 'examen')?.nota || '--'}</span>
        </div>
        <div class="tdc-row">
          <span class="tr-label">Comportamiento</span>
          <span class="tr-val ${getScoreClass(grades.find(g => g.tipo === 'comportamiento')?.nota || 0)}">${grades.find(g => g.tipo === 'comportamiento')?.nota || '--'}</span>
        </div>
        ${formula ? `<div class="tdc-formula">${formula}</div>` : ''}
        <div class="tdc-total ${getScoreClass(avg)}">
          ${avg || 'Sin calificar'}
        </div>
      </div>
    </div>
  `;
}

function calculateTrimAverage(grades) {
  if (!grades.length) return null;
  const trabajos = grades.find(g => g.tipo === 'trabajos')?.nota || 0;
  const examen = grades.find(g => g.tipo === 'examen')?.nota || 0;
  const comp = grades.find(g => g.tipo === 'comportamiento')?.nota || 0;
  return Math.round((trabajos * 0.4 + examen * 0.5 + comp * 0.1) * 100) / 100;
}

function calculateFinalAverage(allGrades) {
  const trims = [1, 2, 3];
  const averages = trims.map(trim => {
    const trimGrades = allGrades.filter(g => g.trimestre === trim);
    return calculateTrimAverage(trimGrades);
  }).filter(avg => avg !== null);

  if (!averages.length) return null;
  return Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 100) / 100;
}

function getScoreClass(score) {
  if (!score) return 'empty';
  return score >= 10 ? 'pass' : 'sup';
}

function getTrimStatus(trim, grades) {
  const now = new Date();
  const currentTrim = Math.ceil((now.getMonth() + 1) / 4);
  if (trim < currentTrim) return { class: 'closed', text: 'Cerrado' };
  if (trim === currentTrim) return { class: 'open', text: 'Abierto' };
  return { class: 'future', text: 'Próximo' };
}

function getFormulaText(grades) {
  const trabajos = grades.find(g => g.tipo === 'trabajos')?.nota;
  const examen = grades.find(g => g.tipo === 'examen')?.nota;
  const comp = grades.find(g => g.tipo === 'comportamiento')?.nota;
  if (!trabajos && !examen && !comp) return '';
  return `Fórmula: <span>${trabajos || 0}</span> × 0.4 + <span>${examen || 0}</span> × 0.5 + <span>${comp || 0}</span> × 0.1`;
}

function toggleDetail(row, materiaId) {
  const detailRow = document.querySelector(`.detail-row[data-materia-id="${materiaId}"]`);
  const isOpen = detailRow.classList.contains('open');

  // Close all details first
  document.querySelectorAll('.detail-row.open').forEach(r => r.classList.remove('open'));
  document.querySelectorAll('.materia-row.expanded').forEach(r => r.classList.remove('expanded'));

  if (!isOpen) {
    detailRow.classList.add('open');
    row.classList.add('expanded');
  }
}

function updateAlerts(grades) {
  const totalSubjects = new Set(grades.map(g => g.materia_id)).size;
  const passedSubjects = [...new Set(grades.map(g => g.materia_id))].filter(materiaId => {
    const materiaGrades = grades.filter(g => g.materia_id === materiaId);
    const avg = calculateFinalAverage(materiaGrades);
    return avg && avg >= 10;
  }).length;

  const failedSubjects = totalSubjects - passedSubjects;
  const pendingSubjects = totalSubjects - passedSubjects - failedSubjects; // assuming some might be pending

  document.querySelector('.alert-card.good .ac-num').textContent = passedSubjects;
  document.querySelector('.alert-card.warn .ac-num').textContent = failedSubjects;
  document.querySelector('.alert-card.info .ac-num').textContent = pendingSubjects;
}

function updateDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.querySelector('.topbar-date').textContent = now.toLocaleDateString('es-ES', options);
}

// Navigation
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  // Navigation handlers
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      showSection(section);
      updateNavActive(item);
    });
  });

  // "Ver calificaciones completas" button
  const btnSeeGrades = document.getElementById('btn-see-grades');
  if (btnSeeGrades) {
    btnSeeGrades.addEventListener('click', () => {
      const navItem = document.querySelector('.nav-item[data-section="calificaciones"]');
      showSection('calificaciones');
      if (navItem) updateNavActive(navItem);
    });
  }

  // Logout
  document.querySelector('.btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });

  // Mobile hamburger
  document.querySelector('.hamburger').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });
});

function showSection(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById(`sec-${sectionName}`);
  if (section) section.classList.add('active');
}

function updateNavActive(activeItem) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  activeItem.classList.add('active');
}