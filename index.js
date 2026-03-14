/* ─── SUPABASE CONFIG ─── */
const SUPA_URL = 'https://upytqftigginepncmoth.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVweXRxZnRpZ2dpbmVwbmNtb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzA5ODQsImV4cCI6MjA4OTA0Njk4NH0.3NonScZQ3UHdYRuiGRFctco-EWYaW32-A375Lqk33Xs';
const { createClient } = window.supabase;
const sb = createClient(SUPA_URL, SUPA_KEY);

/* ─── ERROR BANNER ─── */
function showError(msg) {
  let el = document.getElementById('login-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'login-error';
    el.style.cssText = 'background:rgba(155,22,38,0.15);border:1px solid rgba(155,22,38,0.4);border-radius:8px;padding:10px 14px;font-size:0.82rem;color:#e88;margin-bottom:14px;display:flex;align-items:center;gap:8px;';
    document.querySelector('form').insertAdjacentElement('beforebegin', el);
  }
  el.innerHTML = '⚠️ ' + msg;
  el.style.display = 'flex';
}
function hideError() {
  const el = document.getElementById('login-error');
  if (el) el.style.display = 'none';
}

/* ─── CANVAS PARTICLE BACKGROUND ─── */
(function(){
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles;

  const COLORS = ['rgba(180,130,30,', 'rgba(155,22,38,', 'rgba(212,169,66,'];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkParticle() {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.6 + 0.08,
      color: c
    };
  }

  function init() {
    resize();
    particles = Array.from({length: 120}, mkParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 110) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(180,130,30,${0.06 * (1 - d/110)})`;
          ctx.lineWidth   = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.a + ')';
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
})();

/* ─── SCROLL HINT ─── */
(function(){
  const cards = document.getElementById('news-cards');
  const hint  = document.getElementById('scroll-hint');
  if (!cards || !hint) return;
  cards.addEventListener('scroll', function(){
    const atBottom = cards.scrollTop + cards.clientHeight >= cards.scrollHeight - 20;
    hint.style.opacity = atBottom ? '0' : '1';
    hint.style.transition = 'opacity 0.3s';
  });
})();

/* ─── LOAD NOTICIAS FROM SUPABASE ─── */
async function loadNoticias() {
  try {
    const { data, error } = await sb
      .from('noticias')
      .select('*')
      .eq('activa', true)
      .eq('visibilidad', 'publica')
      .order('fecha', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return; // keep static cards as fallback

    const container = document.getElementById('news-cards');
    container.innerHTML = '';
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    data.forEach(n => {
      const d = new Date(n.fecha);
      const monthStr = months[d.getMonth()] + ' ' + d.getFullYear();
      container.innerHTML += `
        <div class="news-card">
          <div class="news-badge">
            <span class="icon">${n.icono || '📢'}</span>${n.categoria}
            <span style="margin-left:auto;color:rgba(255,255,255,0.22);font-size:0.6rem;">${monthStr}</span>
          </div>
          <h3>${n.titulo}</h3>
          <p>${n.descripcion || ''}</p>
        </div>`;
    });
  } catch(e) { /* keep static fallback */ }
}
loadNoticias();

let currentRole = 'estudiante';

function setRole(role, btn) {
  currentRole = role;
  hideError();
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const usernameInput = document.getElementById('username');
  const label         = document.getElementById('user-label');
  const icon          = document.getElementById('user-icon');
  const hint          = document.getElementById('user-hint');

  if (role === 'estudiante') {
    label.textContent         = 'Usuario / Cédula';
    usernameInput.placeholder = 'Ingresa tu número de cédula';
    icon.textContent          = '🪪';
    hint.innerHTML            = '💡 Estudiantes: ingresa tu <span>número de cédula</span> (contraseña = cédula)';
    hint.style.display        = 'flex';
  } else if (role === 'profesor') {
    label.textContent         = 'Correo Electrónico';
    usernameInput.placeholder = 'tu.correo@gmail.com';
    icon.textContent          = '📧';
    hint.innerHTML            = '💡 Profesores: usa tu <span>correo personal registrado</span>';
    hint.style.display        = 'flex';
  } else {
    label.textContent         = 'Correo Electrónico';
    usernameInput.placeholder = 'administrador@charlesbabbage.com';
    icon.textContent          = '📧';
    hint.style.display        = 'none';
  }
}

/* ─── TOGGLE PASSWORD ─── */
function togglePass() {
  const inp = document.getElementById('password');
  const btn = document.getElementById('toggle-btn');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
}

/* ─── LOGIN SUBMIT ─── */
async function handleLogin(e) {
  e.preventDefault();
  hideError();
  const btn      = document.getElementById('login-btn');
  const rawUser  = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  btn.textContent  = 'Verificando…';
  btn.style.opacity = '0.75';
  btn.disabled     = true;

  try {
    // Determinar email según rol
    let email;
    if (currentRole === 'estudiante') {
      // El email del estudiante es cedula@gmail.com
      email = rawUser + '@gmail.com';
    } else {
      email = rawUser;
    }

    // Autenticar con Supabase
    const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password });

    if (authError) {
      showError('Usuario o contraseña incorrectos. Verifica tus datos.');
      return;
    }

    // Verificar roles del usuario
    const { data: roles, error: rolesError } = await sb
      .from('user_roles')
      .select('rol')
      .eq('user_id', authData.user.id);

    if (rolesError || !roles || roles.length === 0) {
      showError('No tienes un rol asignado. Contacta al administrador.');
      await sb.auth.signOut();
      return;
    }

    const rolList = roles.map(r => r.rol);

    // Redirigir según rol (admin tiene prioridad)
    if (rolList.includes('admin')) {
      window.location.href = 'admin.html';
    } else if (rolList.includes('docente')) {
      window.location.href = 'docente.html';
    } else if (rolList.includes('estudiante')) {
      window.location.href = 'estudiante.html';
    } else {
      showError('Rol no reconocido. Contacta al administrador.');
      await sb.auth.signOut();
    }

  } catch(err) {
    showError('Error de conexión. Intenta nuevamente.');
  } finally {
    btn.textContent  = 'Ingresar';
    btn.style.opacity = '1';
    btn.disabled     = false;
  }
}

// Event binding
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('toggle-btn').addEventListener('click', togglePass);
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => setRole(btn.dataset.role, btn));
  });
});