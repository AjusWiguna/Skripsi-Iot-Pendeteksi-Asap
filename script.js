// ════════════════════════════════════════════════════
//  FIREBASE CONFIG 
// ════════════════════════════════════════════════════
const firebaseConfig = {
    apiKey:            "AIzaSyDJXfFl1LPWf4NCQXepiIPXN7hUzc7iib4",
    authDomain:        "pendeteksiasap-app.firebaseapp.com",
    databaseURL:       "https://pendeteksiasap-app-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "pendeteksiasap-app",
    storageBucket:     "pendeteksiasap-app.firebasestorage.app",
    messagingSenderId: "788510887251",
    appId:             "1:788510887251:web:e350e43d8a4e795b03a5a6"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ── SETUP AUDIO & NOTIFIKASI PC ───────────────────────
const alarmSound = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
alarmSound.loop = true; 

if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// ── LOGIKA LOGIN, REGISTER & LOGOUT ─────────────────────────────
const loginScreen = document.getElementById('login-screen');
const dashScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const btnLoginSubmit = document.getElementById('btn-login-submit');
const btnRegisterSubmit = document.getElementById('btn-register-submit');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

document.getElementById('show-register').addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginError.style.display = 'none';
});

document.getElementById('show-login').addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    registerError.style.display = 'none';
});

auth.onAuthStateChanged((user) => {
    if (user) {
        loginScreen.classList.remove('active');
        dashScreen.classList.add('active');
        startSensorListener();
        initChart();
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    } else {
        dashScreen.classList.remove('active');
        loginScreen.classList.add('active');
        stopSensorListener();
        if (typeof alarmSound !== 'undefined') {
            alarmSound.pause();
            alarmSound.currentTime = 0;
        }
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    btnLoginSubmit.innerText = "Memeriksa...";
    loginError.style.display = 'none';
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => { btnLoginSubmit.innerText = "Masuk Sistem"; })
        .catch(() => {
            btnLoginSubmit.innerText = "Masuk Sistem";
            loginError.style.display = 'block';
            loginError.innerText = "Email atau password salah!";
        });
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    btnRegisterSubmit.innerText = "Mendaftarkan...";
    registerError.style.display = 'none';
    const email = document.getElementById('register-email').value;
    const pass = document.getElementById('register-password').value;
    auth.createUserWithEmailAndPassword(email, pass)
        .then(() => { btnRegisterSubmit.innerText = "Daftar Akun"; })
        .catch((error) => {
            btnRegisterSubmit.innerText = "Daftar Akun";
            registerError.style.display = 'block';
            if (error.code === 'auth/email-already-in-use') registerError.innerText = "Gagal: Email sudah terdaftar!";
            else if (error.code === 'auth/weak-password') registerError.innerText = "Gagal: Password minimal 6 karakter!";
            else registerError.innerText = "Gagal mendaftar!";
        });
});

document.getElementById('btn-logout').addEventListener('click', () => {
    auth.signOut();
});

// ── PENGATURAN THRESHOLD SISTEM ───────────────────────
// UBAH ANGKA 400 DI BAWAH INI SESUAI DENGAN ANGKA THRESHOLD DI ARDUINO-MU
const THRESHOLD_ASAP = 500; 
const THRESHOLD_SUHU = 45.0;
const BATAS_TRIGGER  = 1;
const MAX_FILTER     = 6;

// ── CHART.JS ──────────────────────────────────────────
let chart = null;

function initChart() {
    const canvas = document.getElementById('realtimeChart');
    if (!canvas) return;
    if (chart) { chart.destroy(); chart = null; }

    chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Suhu (°C)', borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,.05)', borderWidth: 2, pointRadius: 3, fill: true, data: [], yAxisID: 'y' },
                { label: 'Asap Pusat', borderColor: '#3b82f6', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, borderDash: [5, 5], data: [], yAxisID: 'y1' },
                { label: 'Pojok 1', borderColor: '#ef4444', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, data: [], yAxisID: 'y1' },
                { label: 'Pojok 2', borderColor: '#22c55e', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, data: [], yAxisID: 'y1' },
                { label: 'Pojok 3', borderColor: '#a855f7', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, data: [], yAxisID: 'y1' },
                { label: 'Pojok 4', borderColor: '#eab308', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, data: [], yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 400 }, interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#9ca3af' } },
                y: { type: 'linear', position: 'left', min: 0, max: 60, title: { display: true, text: 'Suhu (°C)', color: '#f97316' }, grid: { color: '#f3f4f6' } },
                y1: { type: 'linear', position: 'right', min: 0, max: 4095, title: { display: true, text: 'Kadar Asap (ADC)', color: '#3b82f6' }, grid: { drawOnChartArea: false } }
            },
            plugins: { legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true, font: {size: 11} } } }
        }
    });
}

setInterval(() => {
    document.getElementById('jam-sekarang').innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

// ── LOG PERINGATAN (VARIABEL PISAHAN) ─────────────────
let alertLog   = [];
let prevBahaya = null;
let prevApiLog = false;
let prevAsapLog = false;

function addAlert(msg, type) {
    const now = new Date().toLocaleTimeString('id-ID');
    alertLog.unshift({ msg, type, time: now });
    if (alertLog.length > 15) alertLog.pop();
    document.getElementById('alert-list').innerHTML = alertLog.map(a => `
        <div class="alert-item">
            <div class="alert-dot ${a.type}"></div>
            <div>
                <div class="alert-text">${a.msg}</div>
                <div class="alert-time">${a.time}</div>
            </div>
        </div>
    `).join('');
}

// ── PEMBACAAN DATABASE FIREBASE ───────────────────────
let dbRef = db.ref('sensors/ruangan1');
let isListening = false;

function startSensorListener() {
    if (isListening) return;
    isListening = true;
    
    dbRef.on('value', (snap) => {
        const data = snap.val();
        if (!data) return;

        document.getElementById('banner-label').textContent = 'Sistem Terhubung';
        document.getElementById('status-text').textContent = 'Menerima data secara real-time.';

        const suhu        = parseFloat(data.suhu        ?? 0).toFixed(1);
        const kelembaban  = parseFloat(data.kelembaban  ?? 0).toFixed(1);
        const asapPusat   = parseInt  (data.asap_pusat  ?? 0);
        const p1          = parseInt  (data.asap_pojok1 ?? 0);
        const p2          = parseInt  (data.asap_pojok2 ?? 0);
        const p3          = parseInt  (data.asap_pojok3 ?? 0);
        const p4          = parseInt  (data.asap_pojok4 ?? 0);
        const apiDet      = data.api           ?? false;
        const isBahaya    = data.status_bahaya ?? false;
        const alarmAktif  = data.alarm_aktif   ?? false;
        const filterCount = parseInt(data.filter_count  ?? 0);

        // Update UI Angka
        document.getElementById('val-suhu').innerHTML = suhu + '<span class="card-unit">°C</span>';
        document.getElementById('val-suhu').className = suhu >= THRESHOLD_SUHU ? 'card-value danger' : 'card-value';
        document.getElementById('val-hum').innerHTML = kelembaban + '<span class="card-unit">%</span>';
        document.getElementById('val-asap1').innerHTML = asapPusat + '<span class="card-unit">ADC</span>';
        document.getElementById('val-asap1').className = asapPusat >= THRESHOLD_ASAP ? 'card-value danger' : 'card-value';

        const elApi = document.getElementById('val-api');
        const icApi = document.getElementById('icon-api');
        if (apiDet) {
            elApi.className = 'card-value danger'; elApi.textContent = 'TERDETEKSI';
            icApi.textContent = '🔴'; icApi.className = 'card-icon icon-fire danger';
        } else {
            elApi.className = 'card-value safe-text'; elApi.textContent = 'AMAN';
            icApi.textContent = '🟢'; icApi.className = 'card-icon icon-fire';
        }

        [[p1,'pojok1'],[p2,'pojok2'],[p3,'pojok3'],[p4,'pojok4']].forEach(([val,id]) => {
            const el   = document.getElementById('val-' + id);
            const card = document.getElementById(id + '-card');
            el.textContent = val + " ADC";
            if (val >= THRESHOLD_ASAP) {
                el.className = 'pojok-val danger'; card.className = 'pojok-item danger';
            } else if (val >= THRESHOLD_ASAP * 0.7) {
                el.className = 'pojok-val warning'; card.className = 'pojok-item warning';
            } else {
                el.className = 'pojok-val'; card.className = 'pojok-item';
            }
        });

        const pct = Math.round((filterCount / MAX_FILTER) * 100);
        const fill = document.getElementById('filter-fill');
        fill.style.width = pct + '%';
        document.getElementById('filter-count').textContent = filterCount + ' / ' + MAX_FILTER;
        fill.style.background = filterCount >= BATAS_TRIGGER ? 'var(--danger)' : (filterCount > 0 ? 'var(--warn)' : 'var(--safe)');

        document.getElementById('alarm-strip').className = alarmAktif ? 'active' : '';

        // ── LOGIKA RIWAYAT KHUSUS ASAP & API (BARU) ──
        const cekAsapAda = (asapPusat >= THRESHOLD_ASAP || p1 >= THRESHOLD_ASAP || p2 >= THRESHOLD_ASAP || p3 >= THRESHOLD_ASAP || p4 >= THRESHOLD_ASAP);
        
        if (apiDet && !prevApiLog) {
            addAlert('🔥 PERINGATAN: Sensor mendeteksi keberadaan API!', 'danger');
        }
        if (cekAsapAda && !prevAsapLog) {
            let area = [];
            if (asapPusat >= THRESHOLD_ASAP) area.push('Pusat');
            if (p1 >= THRESHOLD_ASAP) area.push('Kiri Depan');
            if (p2 >= THRESHOLD_ASAP) area.push('Kanan Depan');
            if (p3 >= THRESHOLD_ASAP) area.push('Kiri Belakang');
            if (p4 >= THRESHOLD_ASAP) area.push('Kanan Belakang');
            addAlert('💨 PERINGATAN: Asap terdeteksi di area: ' + area.join(', '), 'warning');
        }

        // Catat status agar tidak nyepam log
        prevApiLog = apiDet;
        prevAsapLog = cekAsapAda;

        // ── LOGIKA ALARM UTAMA & NOTIFIKASI PC ──
        const banner = document.getElementById('status-banner');
        if (isBahaya) {
            banner.className = 'bahaya';
            document.getElementById('status-icon').textContent = '⚠️';
            document.getElementById('banner-label').textContent = 'Peringatan Darurat!';
            
            if (prevBahaya === false) {
                addAlert('🚨 ALARM UTAMA AKTIF! Relay Sirine Menyala.', 'danger');

                alarmSound.play().catch(e => console.log("Browser memblokir autoplay audio.", e));

                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("🚨 ALARM KEBAKARAN AKTIF!", {
                        body: "Sistem memicu sirine! Segera periksa Dashboard.",
                        icon: "https://cdn-icons-png.flaticon.com/512/4201/4201111.png",
                        requireInteraction: true 
                    });
                }
            }
        } else {
            banner.className = '';
            document.getElementById('status-icon').textContent = '✅';
            
            if (prevBahaya === true) {
                addAlert('✅ Kondisi kembali aman. Alarm utama dimatikan.', 'safe');
                
                alarmSound.pause();
                alarmSound.currentTime = 0; 
                
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("✅ KONDISI AMAN", {
                        body: "Semua indikator sensor telah kembali normal.",
                        icon: "https://cdn-icons-png.flaticon.com/512/1904/1904118.png"
                    });
                }
            }
        }
        prevBahaya = isBahaya;

        // Memasukkan Data ke Grafik
        if (chart) {
            const t = new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
            chart.data.labels.push(t);
            chart.data.datasets[0].data.push(parseFloat(suhu));
            chart.data.datasets[1].data.push(parseInt(asapPusat));
            chart.data.datasets[2].data.push(parseInt(p1));
            chart.data.datasets[3].data.push(parseInt(p2));
            chart.data.datasets[4].data.push(parseInt(p3));
            chart.data.datasets[5].data.push(parseInt(p4));
            
            if (chart.data.labels.length > 20) {
                chart.data.labels.shift();
                chart.data.datasets.forEach(ds => ds.data.shift());
            }
            chart.update();
        }
    });
}

function stopSensorListener() {
    if (!isListening) return;
    dbRef.off();
    isListening = false;
    document.getElementById('banner-label').textContent = 'Menunggu Login';
    document.getElementById('status-text').textContent = 'Sistem terputus. Silakan login.';
}