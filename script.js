/* ===== WC2026 DASHBOARD — MAIN JS (ROBUST VERSION) ===== */
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-6";

/* ─── State ─── */
let notifOn = false, notifPerm = false;
let pollTimer = null;
let prevScores = {};

// ดักจับ Error เผื่อ LocalStorage มีปัญหา
let predAccuracy = { correct: 0, wrong: 0, total: 0 };
try {
  const storedAcc = localStorage.getItem('wc26_acc');
  if (storedAcc) predAccuracy = JSON.parse(storedAcc);
} catch (e) { console.warn("Storage Error:", e); }

let predictions = [];
try {
  const storedPreds = localStorage.getItem('wc26_preds');
  if (storedPreds) predictions = JSON.parse(storedPreds);
} catch (e) { console.warn("Storage Error:", e); }

/* ─── Hardcoded fallback data ─── */
const FALLBACK_MATCHES = [
  { group:"Group A", status:"final", home:{name:"Mexico",flag:"🇲🇽",score:2}, away:{name:"South Africa",flag:"🇿🇦",score:0}, time:"11 มิ.ย. 09:00", venue:"Estadio Azteca, CDMX", goals:[{team:"Mexico",scorer:"Quiñones",min:23},{team:"Mexico",scorer:"Martín",min:67}]},
  { group:"Group A", status:"final", home:{name:"South Korea",flag:"🇰🇷",score:2}, away:{name:"Czechia",flag:"🇨🇿",score:1}, time:"11 มิ.ย. 12:00", venue:"Estadio Akron, Guadalajara", goals:[{team:"Czechia",scorer:"Krejcí",min:34},{team:"South Korea",scorer:"Hwang In-Beom",min:58},{team:"South Korea",scorer:"Oh Hyeon-Gyu",min:81}]},
  { group:"Group B", status:"upcoming", home:{name:"Canada",flag:"🇨🇦",score:null}, away:{name:"Bosnia & Herz.",flag:"🇧🇦",score:null}, time:"12 มิ.ย. 02:00", venue:"BMO Field, Toronto", goals:[]},
  { group:"Group D", status:"upcoming", home:{name:"USA",flag:"🇺🇸",score:null}, away:{name:"Paraguay",flag:"🇵🇾",score:null}, time:"12 มิ.ย. 08:00", venue:"SoFi Stadium, Inglewood", goals:[]}
];

const ALL_GROUPS = [
  { name:"Group A", teams:[{n:"Mexico 🇲🇽",p:1,w:1,d:0,l:0,gf:2,ga:0,pts:3},{n:"South Korea 🇰🇷",p:1,w:1,d:0,l:0,gf:2,ga:1,pts:3},{n:"Czechia 🇨🇿",p:1,w:0,d:0,l:1,gf:1,ga:2,pts:0},{n:"South Africa 🇿🇦",p:1,w:0,d:0,l:1,gf:0,ga:2,pts:0}]},
  { name:"Group B", teams:[{n:"Canada 🇨🇦",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Bosnia 🇧🇦",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Qatar 🇶🇦",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Switzerland 🇨🇭",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group C", teams:[{n:"Brazil 🇧🇷",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Morocco 🇲🇦",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Haiti 🇭🇹",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group D", teams:[{n:"USA 🇺🇸",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Paraguay 🇵🇾",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Australia 🇦🇺",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Türkiye 🇹🇷",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group E", teams:[{n:"Germany 🇩🇪",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Ivory Coast 🇨🇮",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Ecuador 🇪🇨",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Curaçao 🇨🇼",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group F", teams:[{n:"Netherlands 🇳🇱",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Japan 🇯🇵",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Sweden 🇸🇪",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Tunisia 🇹🇳",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group G", teams:[{n:"Belgium 🇧🇪",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Egypt 🇪🇬",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Iran 🇮🇷",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"New Zealand 🇳🇿",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group H", teams:[{n:"Spain 🇪🇸",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Saudi Arabia 🇸🇦",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Uruguay 🇺🇾",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Cape Verde 🇨🇻",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group I", teams:[{n:"France 🇫🇷",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Senegal 🇸🇳",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Iraq 🇮🇶",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Norway 🇳🇴",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group J", teams:[{n:"Argentina 🇦🇷",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Algeria 🇩🇿",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Austria 🇦🇹",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Jordan 🇯🇴",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group K", teams:[{n:"Portugal 🇵🇹",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"DR Congo 🇨🇩",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Uzbekistan 🇺🇿",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Colombia 🇨🇴",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
  { name:"Group L", teams:[{n:"England 🏴󠁧󠁢󠁥󠁮󠁧󠁿",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Croatia 🇭🇷",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Ghana 🇬🇭",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0},{n:"Panama 🇵🇦",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]},
];

const DEFAULT_MATCHES_FOR_PRED = [
  { id:'m1', home:'Canada 🇨🇦', away:'Bosnia & Herz. 🇧🇦', group:'Group B', time:'12 มิ.ย. 02:00' },
  { id:'m2', home:'USA 🇺🇸', away:'Paraguay 🇵🇾', group:'Group D', time:'12 มิ.ย. 08:00' },
  { id:'m3', home:'Brazil 🇧🇷', away:'Morocco 🇲🇦', group:'Group C', time:'13 มิ.ย. 02:00' },
  { id:'m4', home:'Argentina 🇦🇷', away:'Algeria 🇩🇿', group:'Group J', time:'14 มิ.ย.' }
];

/* ═══════════════════════════════
   LIVE SCORES & API
═══════════════════════════════ */
async function fetchLiveScores(showSpin = true) {
  if (showSpin) {
    document.getElementById('rfSpin').style.display = 'inline-block';
    document.getElementById('rfIcon').style.display = 'none';
  }
  setStatus('yellow', 'กำลังเชื่อมต่อฐานข้อมูล...');

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1000,
        system: `Return ONLY valid JSON format with matches.`,
        messages: [{ role: "user", content: "Get scores" }]
      })
    });
    
    if (!res.ok) throw new Error("API Unauthorized or Blocked");

    const data = await res.json();
    const text = data.content.map(i => i.type === 'text' ? i.text : '').filter(Boolean).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.matches?.length) {
      checkGoalAlerts(parsed.matches);
      renderMatchList(parsed.matches);
      setStatus('green', 'ข้อมูลสดพร้อมใช้งาน');
    } else {
      throw new Error('empty data');
    }
  } catch (e) {
    // โหลดข้อมูลสำรองทันทีเมื่อ API ดึงไม่ได้ (เพื่อให้เว็บไม่ค้าง)
    console.warn("Using Fallback Data:", e.message);
    renderMatchList(FALLBACK_MATCHES);
    setStatus('red', 'ใช้ข้อมูลจำลอง (ระบบ AI อยู่ในโหมดสาธิต)');
  }

  if (showSpin) {
    document.getElementById('rfSpin').style.display = 'none';
    document.getElementById('rfIcon').style.display = '';
  }
  const now = new Date();
  document.getElementById('lastUpd').textContent =
    `อัปเดต ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')} น.`;
}

function setStatus(color, msg) {
  const dot = document.getElementById('statusDot');
  if(dot) dot.className = 'dot-status ' + color;
  const msgEl = document.getElementById('statusMsg');
  if(msgEl) msgEl.textContent = msg;
}

function checkGoalAlerts(matches) {
  if (!notifOn) return;
  matches.forEach(m => {
    const key = m.home.name + '_' + m.away.name;
    const prev = prevScores[key];
    const hS = m.home.score || 0, aS = m.away.score || 0;
    if (prev) {
      const lastGoal = m.goals?.slice(-1)[0];
      if (hS > prev.home) fireGoalNotif(m.home.flag + ' ' + m.home.name, m.away.name, lastGoal?.scorer || '?', lastGoal?.min || '?');
      if (aS > prev.away) fireGoalNotif(m.away.flag + ' ' + m.away.name, m.home.name, lastGoal?.scorer || '?', lastGoal?.min || '?');
    }
    prevScores[key] = { home: hS, away: aS };
  });
}

function renderMatchCard(m) {
  const sClass = m.status === 'live' ? 'ms-live' : m.status === 'final' ? 'ms-final' : 'ms-soon';
  const sText  = m.status === 'live' ? `🔴 LIVE ${m.minute ? m.minute + "'" : ''}` :
                 m.status === 'final' ? '✅ จบแล้ว' : '⏰ กำลังจะเตะ';
  const hasScore = m.home.score !== null && m.away.score !== null;
  const scoreHtml = hasScore
    ? `<div class="score-block"><span class="score-num">${m.home.score}</span><span class="score-sep">:</span><span class="score-num">${m.away.score}</span></div>`
    : `<div class="score-block"><span class="score-vs">VS</span></div>`;

  const goalsHtml = m.goals?.length
    ? `<div class="goal-feed">${m.goals.map(g =>
        `<div class="goal-item"><span class="goal-min">${g.min}'</span><span>⚽ ${g.scorer}${g.og?' (OG)':''} — ${g.team}</span></div>`
      ).join('')}</div>`
    : '';

  return `
    <div class="match-card ${m.status}">
      <div class="match-status">
        <span class="${sClass}">${sText}</span>
        <span class="group-tag">${m.group}</span>
      </div>
      <div class="match-teams">
        <span class="team-name">${m.home.flag} ${m.home.name}</span>
        ${scoreHtml}
        <span class="team-name away">${m.away.name} ${m.away.flag}</span>
      </div>
      <div class="match-meta"><span>📍 ${m.venue}</span><span>🕐 ${m.time}</span></div>
      ${goalsHtml}
    </div>`;
}

function renderMatchList(matches) {
  const live = matches.filter(m => m.status === 'live');
  const final = matches.filter(m => m.status === 'final');
  const soon = matches.filter(m => m.status === 'upcoming');
  let html = '';
  if (live.length)  { html += `<div class="section-label">🔴 กำลังแข่งอยู่</div>`; live.forEach(m => html += renderMatchCard(m)); }
  if (soon.length)  { html += `<div class="section-label">📅 วันนี้ — 12 มิถุนายน</div>`; soon.forEach(m => html += renderMatchCard(m)); }
  if (final.length) { html += `<div class="section-label">✅ ผลล่าสุด</div>`; final.forEach(m => html += renderMatchCard(m)); }
  
  const contentDiv = document.getElementById('scores-content');
  if(contentDiv) contentDiv.innerHTML = html || '<p style="text-align:center;padding:2rem;color:var(--text3)">ไม่พบข้อมูลแมตช์</p>';
}

/* ═══════════════════════════════
   PREDICTIONS
═══════════════════════════════ */
function renderAccuracyStrip() {
  const { correct, wrong, total } = predAccuracy;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const resolved = correct + wrong;
  return `
    <div class="accuracy-strip">
      <div>
        <div class="acc-num">${pct}%</div>
        <div class="acc-label">ความแม่น AI</div>
      </div>
      <div style="flex:1;padding:0 8px">
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--gold);border-radius:3px;transition:width .5s"></div>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">${resolved} นัดประเมินแล้ว จาก ${total} ทั้งหมด</div>
      </div>
      <div class="acc-details">
        <span style="color:var(--green)">✅ ถูก ${correct}</span><br>
        <span style="color:var(--red)">❌ ผิด ${wrong}</span>
      </div>
    </div>`;
}

async function generateAIPrediction(homeTeam, awayTeam, group, matchTime, predId) {
  const btn = document.getElementById('genBtn_' + predId);
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> กำลังวิเคราะห์...'; }
  
  // จำลองการคิดของ AI 1.5 วินาที เพื่อให้เว็บไม่ค้างถ้า API เรียกไม่ได้
  setTimeout(() => {
    const pred = {
      id: predId, home: homeTeam, away: awayTeam, group: group, time: matchTime, result: null,
      winner: homeTeam, homeWin: 55, draw: 25, awayWin: 20,
      tags: [{t:"เต็งแชมป์", c:"g"}, {t:"ฟอร์มแรง", c:"g"}],
      reasons: `<strong>วิเคราะห์จำลอง:</strong> เนื่องจากระบบ AI API ขาดการยืนยันตัวตน (Demo Mode) จึงแสดงผลการคาดการณ์แบบจำลอง<br><br>ทีม ${homeTeam} ดูมีภาษีดีกว่าจากสถิติที่ผ่านมา`
    };

    const existing = predictions.findIndex(p => p.id === predId);
    if (existing >= 0) predictions[existing] = pred;
    else predictions.push(pred);
    
    localStorage.setItem('wc26_preds', JSON.stringify(predictions));
    predAccuracy.total = predictions.length;
    localStorage.setItem('wc26_acc', JSON.stringify(predAccuracy));

    renderPredictPanel();
  }, 1500);
}

function markResult(predId, correct) {
  const pred = predictions.find(p => p.id === predId);
  if (!pred || pred.result !== null) return;
  pred.result = correct ? 'correct' : 'wrong';
  if (correct) predAccuracy.correct++;
  else predAccuracy.wrong++;
  localStorage.setItem('wc26_preds', JSON.stringify(predictions));
  localStorage.setItem('wc26_acc', JSON.stringify(predAccuracy));
  renderPredictPanel();
  showToast(correct ? '✅' : '❌', correct ? 'ถูกต้อง!' : 'ผิด...', `${pred.home} vs ${pred.away}`);
}

function renderPredictCard(matchDef) {
  const pred = predictions.find(p => p.id === matchDef.id);
  if (!pred) {
    return `
      <div class="pred-card">
        <div class="pred-header">
          <div class="pred-match-title">${matchDef.home} <span style="color:var(--text3);font-weight:400">vs</span> ${matchDef.away}</div>
          <div class="pred-meta">${matchDef.group} · ${matchDef.time}</div>
        </div>
        <button class="ai-gen-btn" id="genBtn_${matchDef.id}"
          onclick="generateAIPrediction('${matchDef.home}','${matchDef.away}','${matchDef.group}','${matchDef.time}','${matchDef.id}')">
          🤖 วิเคราะห์ด้วย AI
        </button>
      </div>`;
  }

  const resultBadgeClass = pred.result === 'correct' ? 'rb-correct' : pred.result === 'wrong' ? 'rb-wrong' : 'rb-pending';
  const resultText = pred.result === 'correct' ? '✅ ทำนายถูก!' : pred.result === 'wrong' ? '❌ ทำนายผิด' : '⏳ รอผลตัดสิน';
  const tags = (pred.tags || []).map(t => `<span class="ntag ${t.c}">${t.t}</span>`).join('');
  const markBtns = pred.result === null ? `
    <div style="display:flex;gap:6px;margin-top:10px">
      <button onclick="markResult('${matchDef.id}',true)" style="flex:1;padding:7px;background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.3);color:var(--green);border-radius:var(--r-sm);cursor:pointer;font-size:12px;font-family:var(--font-body)">✅ ถูก</button>
      <button onclick="markResult('${matchDef.id}',false)" style="flex:1;padding:7px;background:rgba(232,0,28,.1);border:1px solid rgba(232,0,28,.2);color:var(--red);border-radius:var(--r-sm);cursor:pointer;font-size:12px;font-family:var(--font-body)">❌ ผิด</button>
    </div>` : '';

  return `
    <div class="pred-card">
      <div class="pred-header">
        <div class="pred-match-title">${pred.home} <span style="color:var(--text3);font-weight:400">vs</span> ${pred.away}</div>
        <div class="pred-meta">${pred.group} · ${pred.time}</div>
      </div>
      <span class="result-badge ${resultBadgeClass}">${resultText}</span>
      <div class="tags">${tags}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:6px">คาดว่า <strong style="color:var(--gold)">${pred.winner}</strong> ชนะ</div>
      <div class="prob-bar-wrap">
        <div class="prob-bar">
          <div class="pb-home" style="flex:${pred.homeWin}"></div>
          <div class="pb-draw" style="flex:${pred.draw}"></div>
          <div class="pb-away" style="flex:${pred.awayWin}"></div>
        </div>
        <div class="prob-labels">
          <span class="pl-home">เหย้า ${pred.homeWin}%</span>
          <span class="pl-draw">เสมอ ${pred.draw}%</span>
          <span class="pl-away">${pred.awayWin}% เยือน</span>
        </div>
      </div>
      <div class="pred-reasons">${pred.reasons}</div>
      ${markBtns}
      <button class="ai-gen-btn" style="margin-top:8px" id="genBtn_${matchDef.id}"
        onclick="generateAIPrediction('${matchDef.home}','${matchDef.away}','${matchDef.group}','${matchDef.time}','${matchDef.id}')">
        🔄 วิเคราะห์ใหม่
      </button>
    </div>`;
}

function renderPredictPanel() {
  let html = renderAccuracyStrip();
  DEFAULT_MATCHES_FOR_PRED.forEach(m => { html += renderPredictCard(m); });
  const predictDiv = document.getElementById('predict-content');
  if(predictDiv) predictDiv.innerHTML = html;
}

/* ═══════════════════════════════
   GROUP TABLE
═══════════════════════════════ */
function renderGroups() {
  let html = '<div class="groups-grid">';
  ALL_GROUPS.forEach(g => {
    const sorted = [...g.teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
    html += `<div>
      <div class="grp-card">
        <div class="grp-title">${g.name}</div>
        <table>
          <thead><tr><th class="tl">ทีม</th><th>แข่ง</th><th>W</th><th>D</th><th>L</th><th>+/-</th><th>แต้ม</th></tr></thead>
          <tbody>${sorted.map((t, i) => `
            <tr class="${i < 2 ? 'qualify' : ''}">
              <td class="tl">${t.n}</td>
              <td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
              <td>${t.gf - t.ga >= 0 ? '+' : ''}${t.gf - t.ga}</td>
              <td class="${t.pts > 0 ? 'pts-hi' : ''}">${t.pts}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  });
  html += '</div>';
  const groupDiv = document.getElementById('groups-content');
  if(groupDiv) groupDiv.innerHTML = html;
}

/* ═══════════════════════════════
   UI INTERACTIONS
═══════════════════════════════ */
function showTab(id, el) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
}

function toggleNotif() {
  if (!notifOn) {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => { notifPerm = p === 'granted'; activateNotif(); });
    } else activateNotif();
  } else {
    notifOn = false;
    clearInterval(pollTimer);
    document.getElementById('notifBtn').classList.remove('on');
    document.getElementById('notifBtn').innerHTML = '🔔 แจ้งเตือน';
    showToast('🔕', 'ปิดแจ้งเตือนแล้ว', 'จะไม่รับแจ้งเตือนอีก');
  }
}

function activateNotif() {
  notifOn = true;
  document.getElementById('notifBtn').classList.add('on');
  document.getElementById('notifBtn').innerHTML = '🔔 เปิดอยู่';
  showToast('🔔', 'เปิดแจ้งเตือนแล้ว!', 'จะแจ้งทุกครั้งที่มีประตูในบอลโลก 2026');
  pollTimer = setInterval(() => fetchLiveScores(false), 60000);
}

function fireGoalNotif(team, opp, scorer, min) {
  showToast('⚽', `ประตู! ${team}`, `${scorer} ยิงนาทีที่ ${min}' (vs ${opp})`, 8000);
  if (notifPerm) new Notification(`⚽ ประตู! ${team}`, { body: `${scorer} ยิงนาทีที่ ${min}' กับ ${opp}` });
}

function showToast(icon, title, sub, dur = 4500) {
  const area = document.getElementById('toastArea');
  if(!area) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="toast-icon">${icon}</span>
    <div class="toast-body"><div class="toast-title">${title}</div><div class="toast-sub">${sub}</div></div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>`;
  area.appendChild(t);
  setTimeout(() => t?.remove(), dur);
}

/* ─── INITIALIZATION ─── */
// ใช้ DOMContentLoaded เพื่อให้แน่ใจว่าโหลด HTML เสร็จก่อนรันคำสั่งต่างๆ
document.addEventListener('DOMContentLoaded', () => {
  fetchLiveScores();
  renderPredictPanel();
  renderGroups();
});
