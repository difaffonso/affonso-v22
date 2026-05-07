import { useState, useEffect } from "react";

// ── Paleta de cores ──────────────────────────────────────────
const G = {
  bg: "#EEF3F0",
  card: "#FFF",
  primary: "#1B5E4A",
  accent: "#E3EFE9",
  accentDark: "#A8D5C0",
  text: "#162420",
  muted: "#6B8880",
  red: "#C0392B",
  yellow: "#D68910",
  blue: "#1A5276",
  purple: "#6C3483",
  border: "#D5E8DF",
  success: "#1E8449",
  orange: "#CA6F1E",
};

const UCOLS = ["#1B5E4A","#6C3483","#1A5276","#CA6F1E","#C0392B","#148F77","#D68910"];

// ── Helpers ──────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => {
  if (!d) return "";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};
const fmtTime = (t) => t || "";
const uid = () => Math.random().toString(36).slice(2, 9);
const cur = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const wa = (phone, msg) => {
  const n = phone.replace(/\D/g, "");
  window.open("https://wa.me/55" + n + "?text=" + encodeURIComponent(msg), "_blank");
};

const SLOTS = (() => {
  const s = [];
  for (let h = 8; h <= 19; h++) {
    if (h === 8) s.push("08:30");
    else {
      s.push(String(h).padStart(2, "0") + ":00");
      if (h < 19) s.push(String(h).padStart(2, "0") + ":30");
    }
  }
  return s;
})();

const PAY = ["Dinheiro", "PIX", "Cartao Credito", "Cartao Debito", "Convenio", "Cheque"];
const STATUS_L = { confirmed: "Confirmado", pending: "Pendente", done: "Realizado", cancelled: "Cancelado", missed: "Faltou", rescheduled: "Desmarcado" };
const STATUS_C = { confirmed: G.primary, pending: G.yellow, done: G.muted, cancelled: G.red, missed: G.orange, rescheduled: G.purple };
const PROCS_DEF = ["Consulta", "Limpeza", "Restauracao", "Canal", "Extracao", "Cirurgia", "Clareamento", "Implante", "Ortodontia", "Protese", "Radiografia"];
const PROS_T = ["Coroa Metalocerâmica", "Coroa Zirconia", "Coroa Porcelana", "PPR", "PPF", "Protese Total", "Faceta", "Inlay/Onlay", "Implante (coroa)", "Protocolo", "Outro"];
const PROS_SL = { waiting: "Aguardando", returned: "Retornou", placed: "Instalada", remake: "Refazer" };
const PROS_SC = { waiting: G.yellow, returned: G.blue, placed: G.success, remake: G.red };
const IMPL_ST = ["Extracao", "Enxerto", "Implante", "Protese", "Controle"];
const HEALTH_FLAGS = ["HAS", "Diabetes", "Cardiopatia", "Coagulopatia", "Alergia", "Gestante", "Osteoporose", "Imunossuprimido"];

// ── Seeds ────────────────────────────────────────────────────
const USERS0 = [
  { id: 1, name: "Dr. Carlos Affonso", role: "Admin", level: 3, login: "admin", pass: "1234", dentistId: 1, color: UCOLS[0], active: true },
  { id: 2, name: "Fernanda", role: "Recepcionista", level: 2, login: "fernanda", pass: "1234", dentistId: null, color: UCOLS[1], active: true },
  { id: 3, name: "Dra. Lucia", role: "Dentista", level: 1, login: "lucia", pass: "1234", dentistId: 2, color: UCOLS[2], active: true },
];
const DENTISTS0 = [
  { id: 1, name: "Dr. Carlos Affonso", cro: "CRO-SP 12345", specialty: "Implantodontia", phone: "", email: "", color: UCOLS[0], pct: 50 },
  { id: 2, name: "Dra. Lucia", cro: "CRO-SP 67890", specialty: "Ortodontia", phone: "", email: "", color: UCOLS[2], pct: 50 },
];

// ── Storage ──────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── CSS Global ───────────────────────────────────────────────
const injectCSS = () => {
  if (document.getElementById("aff-css")) return;
  const s = document.createElement("style");
  s.id = "aff-css";
  s.textContent = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} body{font-family:'DM Sans',sans-serif;background:${G.bg};color:${G.text};} ::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-thumb{background:${G.accentDark};border-radius:3px;} input,select,textarea,button{font-family:'DM Sans',sans-serif;} @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}} .fi{animation:fi .2s ease} @media(max-width:700px){.hide-sm{display:none!important}}`;
  document.head.appendChild(s);
};

// ── Componentes Base ─────────────────────────────────────────
const Btn = ({ ch, onClick, v = "p", sm, disabled, style }) => {
  const base = {
    border: "none", cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 8, fontWeight: 700, transition: "opacity .15s",
    fontSize: sm ? 12 : 14, padding: sm ? "5px 10px" : "9px 18px",
    opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    p: { background: G.primary, color: "#fff" },
    g: { background: G.accent, color: G.primary },
    r: { background: G.red, color: "#fff" },
    w: { background: "#25D366", color: "#fff" },
    b: { background: G.blue, color: "#fff" },
  };
  return <button style={{ ...base, ...variants[v], ...style }} onClick={onClick} disabled={disabled}>{ch}</button>;
};

const Inp = ({ lb, val, set, type = "text", ph = "", ro, min, max, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
    {lb && <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: ".4px" }}>{lb}</label>}
    <input value={val || ""} onChange={e => set && set(e.target.value)} type={type} placeholder={ph} readOnly={ro} min={min} max={max}
      style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "8px 11px", fontSize: 14, outline: "none", color: G.text, background: ro ? "#f7f9f8" : "#fff" }} />
  </div>
);

const Txt = ({ lb, val, set, rows = 3, ro, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
    {lb && <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: ".4px" }}>{lb}</label>}
    <textarea value={val || ""} onChange={e => set && set(e.target.value)} rows={rows} readOnly={ro}
      style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "8px 11px", fontSize: 14, outline: "none", color: G.text, background: ro ? "#f7f9f8" : "#fff", resize: "vertical" }} />
  </div>
);

const Sel = ({ lb, val, set, opts, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
    {lb && <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: ".4px" }}>{lb}</label>}
    <select value={val || ""} onChange={e => set(e.target.value)}
      style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "8px 11px", fontSize: 14, outline: "none", color: G.text, background: "#fff" }}>
      {opts.map(o => typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const R2 = ({ a, b, gap = 11 }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>{a}{b}</div>;
const R3 = ({ a, b, c, gap = 11 }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap }}>{a}{b}{c}</div>;
const Div = ({ lb }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "5px 0" }}>
    {lb && <span style={{ fontSize: 10, fontWeight: 700, color: G.muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>{lb}</span>}
    <div style={{ flex: 1, height: 1, background: G.border }} />
  </div>
);
const SC2 = ({ save, cancel, lbl = "Salvar" }) => (
  <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", marginTop: 14, paddingTop: 12, borderTop: "1px solid " + G.border }}>
    <Btn ch="Cancelar" v="g" onClick={cancel} />
    <Btn ch={lbl} onClick={save} />
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: G.card, borderRadius: 14, padding: 18, boxShadow: "0 2px 8px #0001", ...style }}>{children}</div>
);

const Modal = ({ children, onClose, title, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "#0005", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "#fff", borderRadius: 16, padding: 22, width: "100%", maxWidth: wide ? 760 : 520, maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 17 }}>{title}</span>
        <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: G.muted }}>x</button>
      </div>
      {children}
    </div>
  </div>
);

// ── DatePicker ───────────────────────────────────────────────
const DatePick = ({ lb, val, set, style }) => {
  const [y, setY] = useState(val ? val.slice(0, 4) : "");
  const [m, setM] = useState(val ? val.slice(5, 7) : "");
  const [d, setD] = useState(val ? val.slice(8, 10) : "");
  useEffect(() => { if (y && m && d) set(y + "-" + m.padStart(2, "0") + "-" + d.padStart(2, "0")); }, [y, m, d]);
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {lb && <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase" }}>{lb}</label>}
      <div style={{ display: "flex", gap: 5 }}>
        <input value={d} onChange={e => setD(e.target.value)} placeholder="Dia" type="number" min="1" max="31"
          style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "8px 6px", width: 56, fontSize: 14, outline: "none", textAlign: "center" }} />
        <select value={m} onChange={e => setM(e.target.value)}
          style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "8px 4px", fontSize: 13, outline: "none", flex: 1 }}>
          <option value="">Mes</option>
          {months.map((mn, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{mn}</option>)}
        </select>
        <input value={y} onChange={e => setY(e.target.value)} placeholder="Ano" type="number" min="1900" max="2100"
          style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "8px 6px", width: 70, fontSize: 14, outline: "none", textAlign: "center" }} />
      </div>
    </div>
  );
};

// ── Autocomplete ─────────────────────────────────────────────
const AutoPat = ({ patients, val, set, onSel, placeholder = "Buscar paciente…" }) => {
  const [q, setQ] = useState(val || "");
  const [open, setOpen] = useState(false);
  const hits = q.length > 0 ? patients.filter(p => norm(p.name).includes(norm(q)) || (p.phone || "").includes(q)).slice(0, 8) : [];
  return (
    <div style={{ position: "relative" }}>
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); set && set(e.target.value); }}
        onFocus={() => setOpen(true)} placeholder={placeholder}
        style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "8px 11px", fontSize: 14, outline: "none", width: "100%" }} />
      {open && hits.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid " + G.border, borderRadius: 8, zIndex: 99, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px #0002" }}>
          {hits.map(p => (
            <div key={p.id} onClick={() => { onSel(p); setQ(p.name); setOpen(false); }}
              style={{ padding: "9px 13px", cursor: "pointer", borderBottom: "1px solid " + G.border, fontSize: 14 }}
              onMouseEnter={e => e.target.style.background = G.accent}
              onMouseLeave={e => e.target.style.background = "#fff"}>
              {p.name} {p.phone ? " - " + p.phone : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Login ────────────────────────────────────────────────────
const Login = ({ users, onLogin }) => {
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const handle = () => {
    const u = users.find(x => x.login === login && x.pass === pass && x.active);
    if (u) onLogin(u);
    else setErr("Login ou senha incorretos");
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0d3b2e 0%, #1B5E4A 60%, #2d7a5f 100%)" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, width: 360, boxShadow: "0 20px 60px #0004" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🦷</div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, color: G.primary, fontWeight: 700 }}>Affonso Odontologia</h1>
          <p style={{ color: G.muted, fontSize: 13, marginTop: 4 }}>Sistema de Gestao</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Inp lb="Usuario" val={login} set={setLogin} ph="Digite seu usuario" />
          <Inp lb="Senha" val={pass} set={setPass} type="password" ph="Digite sua senha" />
          {err && <p style={{ color: G.red, fontSize: 13, textAlign: "center" }}>{err}</p>}
          <Btn ch="Entrar" onClick={handle} style={{ marginTop: 4, padding: "12px", fontSize: 15 }} />
        </div>
      </div>
    </div>
  );
};

// ── Sidebar ──────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", icon: "🏠", label: "Dashboard" },
  { id: "agenda", icon: "📅", label: "Agenda" },
  { id: "pacientes", icon: "👥", label: "Pacientes" },
  { id: "financeiro", icon: "💰", label: "Financeiro" },
  { id: "proteses", icon: "🦷", label: "Proteses" },
  { id: "implantes", icon: "🔩", label: "Implantes" },
  { id: "estoque", icon: "📦", label: "Estoque" },
  { id: "lembretes", icon: "🔔", label: "Lembretes" },
  { id: "receituario", icon: "💊", label: "Receituario" },
  { id: "configuracoes", icon: "⚙️", label: "Config" },
];

const Sidebar = ({ page, setPage, user, onLogout, mobile }) => {
  const style = mobile
    ? { display: "flex", background: G.primary, padding: "8px 4px", overflowX: "auto", gap: 2 }
    : { width: 200, minHeight: "100vh", background: G.primary, display: "flex", flexDirection: "column", padding: "16px 8px" };
  return (
    <div style={style}>
      {!mobile && (
        <div style={{ padding: "10px 8px 20px", borderBottom: "1px solid #ffffff22", marginBottom: 10 }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>🦷</div>
          <div style={{ color: "#fff", fontFamily: "Cormorant Garamond, serif", fontSize: 15, fontWeight: 700 }}>Affonso</div>
          <div style={{ color: "#ffffff88", fontSize: 11 }}>Odontologia</div>
        </div>
      )}
      {NAV.map(n => (
        <button key={n.id} onClick={() => setPage(n.id)}
          style={{ display: "flex", alignItems: "center", gap: mobile ? 0 : 9, flexDirection: mobile ? "column" : "row",
            padding: mobile ? "6px 10px" : "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            background: page === n.id ? "#ffffff22" : "transparent",
            color: page === n.id ? "#fff" : "#ffffffaa",
            fontSize: mobile ? 10 : 14, fontWeight: page === n.id ? 700 : 400, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: mobile ? 18 : 16 }}>{n.icon}</span>
          {mobile ? <span>{n.label.slice(0, 7)}</span> : n.label}
        </button>
      ))}
      {!mobile && (
        <div style={{ marginTop: "auto", padding: "12px 8px", borderTop: "1px solid #ffffff22" }}>
          <div style={{ color: "#ffffffcc", fontSize: 12, marginBottom: 8 }}>{user.name}</div>
          <button onClick={onLogout} style={{ color: "#ffffff88", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>Sair</button>
        </div>
      )}
    </div>
  );
};

// ── Dashboard ────────────────────────────────────────────────
const Dashboard = ({ appts, patients, recs, reminders, user, setPage }) => {
  const t = today();
  const todayA = appts.filter(a => a.date === t).sort((a, b) => a.time.localeCompare(b.time));
  const mo = t.slice(0, 7);
  const rev = recs.filter(r => r.date && r.date.startsWith(mo) && r.paid > 0).reduce((s, r) => s + Number(r.paid), 0);
  const pend = recs.filter(r => r.date && r.date.startsWith(mo) && Number(r.balance) > 0).length;
  const todayBirth = patients.filter(p => {
    if (!p.dob) return false;
    const parts = p.dob.split("-");
    return parts[1] === t.slice(5, 7) && parts[2] === t.slice(8, 10);
  });
  const pendRem = reminders.filter(r => !r.done && r.date <= t);
  const Stat = ({ icon, label, val, color, onClick }) => (
    <Card style={{ cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || G.primary }}>{val}</div>
      <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{label}</div>
    </Card>
  );
  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 24, color: G.primary, marginBottom: 18 }}>Boa-vinda, {user.name.split(" ")[0]}!</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 22 }}>
        <Stat icon="📅" label="Consultas hoje" val={todayA.length} onClick={() => setPage("agenda")} />
        <Stat icon="💰" label="Recebido no mes" val={cur(rev)} color={G.success} onClick={() => setPage("financeiro")} />
        <Stat icon="⏳" label="Saldos em aberto" val={pend} color={G.orange} onClick={() => setPage("financeiro")} />
        <Stat icon="🔔" label="Lembretes pendentes" val={pendRem.length} color={pendRem.length ? G.red : G.success} onClick={() => setPage("lembretes")} />
        {todayBirth.length > 0 && <Stat icon="🎂" label="Aniversariantes hoje" val={todayBirth.length} color={G.purple} />}
      </div>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 12, color: G.primary }}>Agenda de hoje — {fmt(t)}</div>
        {todayA.length === 0 && <div style={{ color: G.muted, fontSize: 14 }}>Nenhuma consulta hoje.</div>}
        {todayA.map(a => {
          const p = patients.find(x => x.id === a.patientId);
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid " + G.border }}>
              <div style={{ fontWeight: 700, color: G.primary, width: 48, flexShrink: 0 }}>{a.time}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p ? p.name : "—"}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{a.procedure}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: STATUS_C[a.status] || G.muted, background: G.accent, borderRadius: 20, padding: "2px 10px" }}>
                {STATUS_L[a.status] || a.status}
              </div>
            </div>
          );
        })}
      </Card>
      {todayBirth.length > 0 && (
        <Card style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 10, color: G.purple }}>🎂 Aniversariantes hoje</div>
          {todayBirth.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid " + G.border }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{p.phone}</div>
              </div>
              {p.phone && (
                <Btn ch="🎉 WA" v="w" sm onClick={() => wa(p.phone, "Ola " + p.name + "! A equipe Affonso Odontologia deseja um Feliz Aniversario! 🎂🦷")} />
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

// ── Agenda ───────────────────────────────────────────────────
const getWeek = (ref) => {
  const d = new Date(ref + "T12:00");
  const day = d.getDay();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() - day + i);
    days.push(x.toISOString().slice(0, 10));
  }
  return days;
};

const Agenda = ({ appts, setAppts, patients, dentists, user }) => {
  const [ref, setRef] = useState(today());
  const [calOpen, setCalOpen] = useState(false);
  const [selDate, setSelDate] = useState(today());
  const [modal, setModal] = useState(null);
  const [viewAppt, setViewAppt] = useState(null);
  const week = getWeek(ref);
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const MONTHS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

  const [form, setForm] = useState({ patientId: null, patientName: "", date: today(), time: "08:30", procedure: PROCS_DEF[0], dentistId: dentists[0]?.id || 1, status: "pending", notes: "", payMethod: "PIX", value: "" });

  const dayAppts = (d) => appts.filter(a => a.date === d).sort((a, b) => a.time.localeCompare(b.time));

  const openNew = (date) => {
    setForm({ patientId: null, patientName: "", date, time: "08:30", procedure: PROCS_DEF[0], dentistId: dentists[0]?.id || 1, status: "pending", notes: "", payMethod: "PIX", value: "" });
    setModal("new");
  };

  const save = () => {
    if (!form.patientId && !form.patientName) return alert("Selecione um paciente");
    if (modal === "edit" && viewAppt) {
      setAppts(prev => prev.map(a => a.id === viewAppt.id ? { ...a, ...form } : a));
    } else {
      setAppts(prev => [...prev, { ...form, id: uid() }]);
    }
    setModal(null);
    setViewAppt(null);
  };

  const cancel = (id) => {
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
    setViewAppt(null);
  };

  const va = viewAppt;
  const vp = va ? patients.find(p => p.id === va.patientId) : null;

  return (
    <div style={{ padding: 16 }}>
      {/* Week nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <Btn ch="<" v="g" sm onClick={() => { const d = new Date(ref + "T12:00"); d.setDate(d.getDate() - 7); setRef(d.toISOString().slice(0, 10)); }} />
        <button onClick={() => setCalOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>📅</button>
        <span style={{ fontWeight: 700, color: G.primary, fontSize: 15 }}>
          {fmt(week[0])} — {fmt(week[6])}
        </span>
        <Btn ch=">" v="g" sm onClick={() => { const d = new Date(ref + "T12:00"); d.setDate(d.getDate() + 7); setRef(d.toISOString().slice(0, 10)); }} />
        <Btn ch="Hoje" v="g" sm onClick={() => setRef(today())} />
        <Btn ch="+ Consulta" sm onClick={() => openNew(today())} />
      </div>

      {/* Mini calendar */}
      {calOpen && (
        <Card style={{ marginBottom: 14, maxWidth: 320 }}>
          <input type="month" defaultValue={ref.slice(0, 7)}
            onChange={e => setRef(e.target.value + "-01")}
            style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "6px 10px", fontSize: 14, outline: "none", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
            {weekDays.map(d => <div key={d} style={{ fontSize: 10, color: G.muted, fontWeight: 700 }}>{d}</div>)}
            {(() => {
              const ym = ref.slice(0, 7);
              const first = new Date(ym + "-01T12:00");
              const blanks = first.getDay();
              const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < blanks; i++) cells.push(<div key={"b" + i} />);
              for (let i = 1; i <= days; i++) {
                const dd = ym + "-" + String(i).padStart(2, "0");
                const has = appts.some(a => a.date === dd);
                cells.push(
                  <div key={i} onClick={() => { setRef(dd); setSelDate(dd); setCalOpen(false); }}
                    style={{ fontSize: 11, padding: "4px 2px", cursor: "pointer", borderRadius: 4, fontWeight: has ? 700 : 400,
                      color: dd === today() ? G.primary : G.text, background: dd === selDate ? G.accent : "transparent" }}>
                    {i}{has ? "·" : ""}
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </Card>
      )}

      {/* Week grid */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, minmax(120px, 1fr))", minWidth: 600 }}>
          <div />
          {week.map((d, i) => (
            <div key={d} onClick={() => openNew(d)}
              style={{ textAlign: "center", padding: "8px 4px", cursor: "pointer", borderRadius: 8,
                background: d === today() ? G.accent : "transparent",
                color: d === today() ? G.primary : G.text }}>
              <div style={{ fontSize: 11, color: G.muted }}>{weekDays[i]}</div>
              <div style={{ fontWeight: d === today() ? 700 : 400, fontSize: 14 }}>{Number(d.slice(8))}</div>
            </div>
          ))}
          {SLOTS.map(slot => (
            <>
              <div key={slot + "l"} style={{ fontSize: 11, color: G.muted, textAlign: "right", paddingRight: 8, paddingTop: 4, borderTop: "1px solid " + G.border }}>{slot}</div>
              {week.map(d => {
                const as = dayAppts(d).filter(a => a.time === slot);
                return (
                  <div key={d + slot} style={{ borderTop: "1px solid " + G.border, minHeight: 36, padding: 2 }}>
                    {as.map(a => {
                      const p = patients.find(x => x.id === a.patientId);
                      const dn = dentists.find(x => x.id === a.dentistId);
                      const hf = p ? HEALTH_FLAGS.filter(f => p.health && p.health[f]) : [];
                      return (
                        <div key={a.id} onClick={() => setViewAppt(a)}
                          style={{ background: STATUS_C[a.status] || G.primary, color: "#fff", borderRadius: 6, padding: "3px 6px", fontSize: 11, cursor: "pointer", marginBottom: 2, lineHeight: 1.3 }}>
                          <div style={{ fontWeight: 700 }}>{p ? p.name.split(" ")[0] : "?"}</div>
                          <div style={{ opacity: .85 }}>{a.procedure}</div>
                          {dn && <div style={{ opacity: .7, fontSize: 10 }}>{dn.name.split(" ").pop()}</div>}
                          {hf.length > 0 && <div style={{ fontSize: 9, opacity: .9 }}>⚠️ {hf.join(", ")}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* New/Edit modal */}
      {modal && (
        <Modal title={modal === "edit" ? "Editar Consulta" : "Nova Consulta"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase" }}>Paciente</label>
              <div style={{ marginTop: 4 }}>
                <AutoPat patients={patients} val={form.patientName} set={v => setForm(f => ({ ...f, patientName: v }))}
                  onSel={p => setForm(f => ({ ...f, patientId: p.id, patientName: p.name }))} />
              </div>
            </div>
            <R2 a={<Inp lb="Data" val={form.date} set={v => setForm(f => ({ ...f, date: v }))} type="date" />}
                b={<Sel lb="Horario" val={form.time} set={v => setForm(f => ({ ...f, time: v }))} opts={SLOTS} />} />
            <R2 a={<Sel lb="Procedimento" val={form.procedure} set={v => setForm(f => ({ ...f, procedure: v }))} opts={PROCS_DEF} />}
                b={<Sel lb="Status" val={form.status} set={v => setForm(f => ({ ...f, status: v }))} opts={Object.entries(STATUS_L).map(([v, l]) => ({ v, l }))} />} />
            <Sel lb="Dentista" val={String(form.dentistId)} set={v => setForm(f => ({ ...f, dentistId: Number(v) }))}
              opts={dentists.map(d => ({ v: String(d.id), l: d.name }))} />
            <R2 a={<Sel lb="Pagamento" val={form.payMethod} set={v => setForm(f => ({ ...f, payMethod: v }))} opts={PAY} />}
                b={<Inp lb="Valor (R$)" val={form.value} set={v => setForm(f => ({ ...f, value: v }))} type="number" />} />
            <Txt lb="Observacoes" val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            <SC2 save={save} cancel={() => setModal(null)} />
          </div>
        </Modal>
      )}

      {/* View modal */}
      {va && (
        <Modal title="Detalhes da Consulta" onClose={() => setViewAppt(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: G.accent, borderRadius: 10, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{vp ? vp.name : "Paciente"}</div>
              <div style={{ color: G.muted, fontSize: 13, marginTop: 2 }}>{fmt(va.date)} as {va.time} — {va.procedure}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_C[va.status], background: "#fff", borderRadius: 20, padding: "2px 10px" }}>
                  {STATUS_L[va.status]}
                </span>
              </div>
            </div>
            <Sel lb="Alterar status" val={va.status} set={v => { setAppts(prev => prev.map(a => a.id === va.id ? { ...a, status: v } : a)); setViewAppt(v2 => ({ ...v2, status: v })); }}
              opts={Object.entries(STATUS_L).map(([v, l]) => ({ v, l }))} />
            {va.notes && <Txt lb="Observacoes" val={va.notes} ro rows={2} />}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {vp && vp.phone && <Btn ch="📱 Confirmar" v="w" sm onClick={() => wa(vp.phone, "Ola " + vp.name + "! Lembrando da consulta em " + fmt(va.date) + " as " + va.time + ". Confirme: 1-Sim 2-Nao. Affonso Odontologia")} />}
              {vp && vp.phone && <Btn ch="🔄 Remarcar" v="w" sm onClick={() => wa(vp.phone, "Ola " + vp.name + "! Gostaria de remarcar sua consulta? Por favor nos informe sua disponibilidade. Affonso Odontologia")} />}
              <Btn ch="Editar" v="g" sm onClick={() => { setForm({ ...va, patientName: vp ? vp.name : "" }); setModal("edit"); }} />
              <Btn ch="Cancelar" v="r" sm onClick={() => cancel(va.id)} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Pacientes ────────────────────────────────────────────────
const Pacientes = ({ patients, setPatients, appts, recs }) => {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("ficha");
  const [form, setForm] = useState({ name: "", phone: "", email: "", dob: "", cpf: "", rg: "", address: "", notes: "", health: {}, ficha: "", rx: "", numFicha: "", numRx: "" });

  const list = patients.filter(p => norm(p.name).includes(norm(q)) || (p.phone || "").includes(q) || (p.numFicha || "").includes(q));

  const openNew = () => { setForm({ name: "", phone: "", email: "", dob: "", cpf: "", rg: "", address: "", notes: "", health: {}, ficha: "", rx: "", numFicha: "", numRx: "" }); setModal("new"); };
  const openEdit = (p) => { setSel(p); setForm({ ...p }); setModal("edit"); };
  const openView = (p) => { setSel(p); setTab("ficha"); setModal("view"); };

  const save = () => {
    if (!form.name) return alert("Nome obrigatorio");
    if (modal === "edit") {
      setPatients(prev => prev.map(p => p.id === sel.id ? { ...p, ...form } : p));
    } else {
      const nextNum = String(patients.length + 1).padStart(5, "0");
      setPatients(prev => [...prev, { ...form, id: uid(), numFicha: form.numFicha || "F-" + nextNum }]);
    }
    setModal(null);
  };

  const HealthChk = ({ flag }) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
      <input type="checkbox" checked={!!(form.health && form.health[flag])}
        onChange={e => setForm(f => ({ ...f, health: { ...(f.health || {}), [flag]: e.target.checked } }))} />
      {flag}
    </label>
  );

  const patAppts = sel ? appts.filter(a => a.patientId === sel.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const patRecs = sel ? recs.filter(r => r.patientId === sel.id) : [];
  const saldo = patRecs.reduce((s, r) => s + Number(r.balance || 0), 0);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, telefone ou ficha…"
          style={{ flex: 1, border: "1.5px solid " + G.border, borderRadius: 8, padding: "9px 13px", fontSize: 14, outline: "none" }} />
        <Btn ch="+ Paciente" onClick={openNew} />
      </div>
      <div style={{ color: G.muted, fontSize: 12, marginBottom: 10 }}>{list.length} pacientes</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.slice(0, 50).map(p => {
          const flags = HEALTH_FLAGS.filter(f => p.health && p.health[f]);
          return (
            <Card key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => openView(p)}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: G.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: G.primary, flexShrink: 0 }}>
                {p.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{p.phone} {p.numFicha ? "  |  " + p.numFicha : ""}</div>
                {flags.length > 0 && <div style={{ fontSize: 11, color: G.red, marginTop: 2 }}>⚠️ {flags.join(", ")}</div>}
              </div>
              <Btn ch="Ver" v="g" sm onClick={e => { e.stopPropagation(); openView(p); }} />
            </Card>
          );
        })}
      </div>

      {/* Form modal */}
      {(modal === "new" || modal === "edit") && (
        <Modal title={modal === "edit" ? "Editar Paciente" : "Novo Paciente"} onClose={() => setModal(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Div lb="Dados Pessoais" />
            <R2 a={<Inp lb="Nome completo" val={form.name} set={v => setForm(f => ({ ...f, name: v }))} />}
                b={<Inp lb="Telefone / WhatsApp" val={form.phone} set={v => setForm(f => ({ ...f, phone: v }))} />} />
            <R2 a={<Inp lb="Email" val={form.email} set={v => setForm(f => ({ ...f, email: v }))} />}
                b={<DatePick lb="Data de nascimento" val={form.dob} set={v => setForm(f => ({ ...f, dob: v }))} />} />
            <R3 a={<Inp lb="CPF" val={form.cpf} set={v => setForm(f => ({ ...f, cpf: v }))} />}
                b={<Inp lb="RG" val={form.rg} set={v => setForm(f => ({ ...f, rg: v }))} />}
                c={<Inp lb="No. Ficha" val={form.numFicha} set={v => setForm(f => ({ ...f, numFicha: v }))} />} />
            <Inp lb="Endereco" val={form.address} set={v => setForm(f => ({ ...f, address: v }))} />
            <Div lb="Saude" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {HEALTH_FLAGS.map(f => <HealthChk key={f} flag={f} />)}
            </div>
            <Txt lb="Observacoes de saude" val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            <Div lb="Ficha Clinica" />
            <Txt lb="Historico clinico" val={form.ficha} set={v => setForm(f => ({ ...f, ficha: v }))} rows={4} />
            <SC2 save={save} cancel={() => setModal(null)} />
          </div>
        </Modal>
      )}

      {/* View modal */}
      {modal === "view" && sel && (
        <Modal title={sel.name} onClose={() => setModal(null)} wide>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {["ficha", "consultas", "financeiro"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "7px 16px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: tab === t ? 700 : 400,
                  background: tab === t ? G.primary : G.accent, color: tab === t ? "#fff" : G.text, fontSize: 13 }}>
                {t === "ficha" ? "Ficha" : t === "consultas" ? "Consultas" : "Financeiro"}
              </button>
            ))}
            <Btn ch="Editar" v="g" sm onClick={() => { setModal("edit"); }} />
            {sel.phone && <Btn ch="📋 Anamnese WA" v="w" sm onClick={() => wa(sel.phone, "Ola " + sel.name + "! Por favor preencha sua anamnese antes da consulta: https://forms.gle/exemplo. Affonso Odontologia")} />}
          </div>
          {tab === "ficha" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <R2 a={<Inp lb="Telefone" val={sel.phone} ro />} b={<Inp lb="Email" val={sel.email} ro />} />
              <R2 a={<Inp lb="Nascimento" val={fmt(sel.dob)} ro />} b={<Inp lb="CPF" val={sel.cpf} ro />} />
              {(() => { const flags = HEALTH_FLAGS.filter(f => sel.health && sel.health[f]); return flags.length > 0 ? <div style={{ background: "#fff0f0", borderRadius: 8, padding: 10, fontSize: 13, color: G.red, fontWeight: 600 }}>⚠️ Alertas: {flags.join(" | ")}</div> : null; })()}
              <Txt lb="Historico clinico" val={sel.ficha} ro rows={5} />
              {sel.notes && <Txt lb="Observacoes" val={sel.notes} ro rows={2} />}
            </div>
          )}
          {tab === "consultas" && (
            <div>
              {patAppts.length === 0 && <div style={{ color: G.muted, fontSize: 14 }}>Nenhuma consulta registrada.</div>}
              {patAppts.map(a => (
                <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid " + G.border, alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: G.primary, width: 90, flexShrink: 0, fontSize: 13 }}>{fmt(a.date)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>{a.procedure}</div>
                    <div style={{ fontSize: 12, color: G.muted }}>{a.time}</div>
                  </div>
                  <span style={{ fontSize: 11, color: STATUS_C[a.status], fontWeight: 700 }}>{STATUS_L[a.status]}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "financeiro" && (
            <div>
              <div style={{ background: saldo > 0 ? "#fff0f0" : G.accent, borderRadius: 10, padding: 12, marginBottom: 12, fontWeight: 700, color: saldo > 0 ? G.red : G.success }}>
                {saldo > 0 ? "Saldo devedor: " + cur(saldo) : "Sem pendencias financeiras"}
              </div>
              {patRecs.map(r => (
                <div key={r.id} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid " + G.border, fontSize: 13 }}>
                  <div style={{ width: 90, flexShrink: 0 }}>{fmt(r.date)}</div>
                  <div style={{ flex: 1 }}>{r.procedure}</div>
                  <div>{cur(r.total)}</div>
                  <div style={{ color: r.balance > 0 ? G.red : G.success, fontWeight: 700 }}>{cur(r.paid)} pago</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

// ── Financeiro ───────────────────────────────────────────────
const Financeiro = ({ recs, setRecs, patients, appts, dentists }) => {
  const [mo, setMo] = useState(today().slice(0, 7));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ patientId: null, patientName: "", date: today(), procedure: "", total: "", paid: "", payMethod: "PIX", installments: 1, notes: "" });

  const list = recs.filter(r => r.date && r.date.startsWith(mo));
  const totalRec = list.reduce((s, r) => s + Number(r.paid || 0), 0);
  const totalPend = list.reduce((s, r) => s + Number(r.balance || 0), 0);

  const save = () => {
    if (!form.patientId && !form.patientName) return alert("Selecione um paciente");
    const total = Number(form.total || 0);
    const paid = Number(form.paid || 0);
    setRecs(prev => [...prev, { ...form, id: uid(), balance: total - paid, total, paid }]);
    setModal(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input type="month" value={mo} onChange={e => setMo(e.target.value)}
          style={{ border: "1.5px solid " + G.border, borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }} />
        <Btn ch="+ Recebimento" onClick={() => setModal(true)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
        <Card><div style={{ fontSize: 22, fontWeight: 700, color: G.success }}>{cur(totalRec)}</div><div style={{ fontSize: 12, color: G.muted }}>Recebido no mes</div></Card>
        <Card><div style={{ fontSize: 22, fontWeight: 700, color: G.red }}>{cur(totalPend)}</div><div style={{ fontSize: 12, color: G.muted }}>A receber</div></Card>
        <Card><div style={{ fontSize: 22, fontWeight: 700, color: G.primary }}>{list.length}</div><div style={{ fontSize: 12, color: G.muted }}>Lancamentos</div></Card>
      </div>
      <Card>
        {list.length === 0 && <div style={{ color: G.muted, fontSize: 14 }}>Nenhum lancamento neste mes.</div>}
        {list.map(r => {
          const p = patients.find(x => x.id === r.patientId);
          return (
            <div key={r.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid " + G.border, alignItems: "center" }}>
              <div style={{ width: 90, fontSize: 13, flexShrink: 0, color: G.muted }}>{fmt(r.date)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p ? p.name : r.patientName}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{r.procedure} — {r.payMethod}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{cur(r.total)}</div>
                {r.balance > 0 && <div style={{ fontSize: 11, color: G.red }}>Saldo: {cur(r.balance)}</div>}
              </div>
            </div>
          );
        })}
      </Card>
      {modal && (
        <Modal title="Novo Lancamento" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase" }}>Paciente</label>
              <div style={{ marginTop: 4 }}><AutoPat patients={patients} val={form.patientName} set={v => setForm(f => ({ ...f, patientName: v }))} onSel={p => setForm(f => ({ ...f, patientId: p.id, patientName: p.name }))} /></div>
            </div>
            <R2 a={<Inp lb="Data" val={form.date} set={v => setForm(f => ({ ...f, date: v }))} type="date" />}
                b={<Inp lb="Procedimento" val={form.procedure} set={v => setForm(f => ({ ...f, procedure: v }))} />} />
            <R2 a={<Inp lb="Valor total (R$)" val={form.total} set={v => setForm(f => ({ ...f, total: v }))} type="number" />}
                b={<Inp lb="Valor pago (R$)" val={form.paid} set={v => setForm(f => ({ ...f, paid: v }))} type="number" />} />
            <R2 a={<Sel lb="Forma de pagamento" val={form.payMethod} set={v => setForm(f => ({ ...f, payMethod: v }))} opts={PAY} />}
                b={<Inp lb="Parcelas" val={form.installments} set={v => setForm(f => ({ ...f, installments: v }))} type="number" min="1" />} />
            <Txt lb="Observacoes" val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            <SC2 save={save} cancel={() => setModal(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Proteses ─────────────────────────────────────────────────
const Proteses = ({ pros, setPros, patients, dentists }) => {
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ patientId: null, patientName: "", type: PROS_T[0], lab: "", dateIn: today(), dateEst: "", dateOut: "", dentistId: dentists[0]?.id || 1, status: "waiting", value: "", notes: "", teeth: "" });

  const list = pros.filter(p => norm(p.patientName || "").includes(norm(q)));
  const save = () => {
    if (!form.patientId && !form.patientName) return alert("Selecione um paciente");
    setPros(prev => [...prev, { ...form, id: uid() }]);
    setModal(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…"
          style={{ flex: 1, border: "1.5px solid " + G.border, borderRadius: 8, padding: "9px 13px", fontSize: 14, outline: "none" }} />
        <Btn ch="+ Protese" onClick={() => setModal(true)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(p => {
          const pat = patients.find(x => x.id === p.patientId);
          return (
            <Card key={p.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{pat ? pat.name : p.patientName}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{p.type} — {p.lab}</div>
                <div style={{ fontSize: 12, color: G.muted }}>Entrada: {fmt(p.dateIn)} | Prev: {fmt(p.dateEst)}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: PROS_SC[p.status], background: G.accent, padding: "3px 10px", borderRadius: 20 }}>{PROS_SL[p.status]}</span>
              </div>
              <Sel lb="" val={p.status} set={v => setPros(prev => prev.map(x => x.id === p.id ? { ...x, status: v } : x))}
                opts={Object.entries(PROS_SL).map(([v, l]) => ({ v, l }))} style={{ minWidth: 130 }} />
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title="Nova Protese" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase" }}>Paciente</label>
              <div style={{ marginTop: 4 }}><AutoPat patients={patients} val={form.patientName} set={v => setForm(f => ({ ...f, patientName: v }))} onSel={p => setForm(f => ({ ...f, patientId: p.id, patientName: p.name }))} /></div>
            </div>
            <R2 a={<Sel lb="Tipo" val={form.type} set={v => setForm(f => ({ ...f, type: v }))} opts={PROS_T} />}
                b={<Inp lb="Laboratorio" val={form.lab} set={v => setForm(f => ({ ...f, lab: v }))} />} />
            <R2 a={<Inp lb="Data entrada" val={form.dateIn} set={v => setForm(f => ({ ...f, dateIn: v }))} type="date" />}
                b={<Inp lb="Prev entrega" val={form.dateEst} set={v => setForm(f => ({ ...f, dateEst: v }))} type="date" />} />
            <R2 a={<Inp lb="Dentes" val={form.teeth} set={v => setForm(f => ({ ...f, teeth: v }))} />}
                b={<Inp lb="Valor (R$)" val={form.value} set={v => setForm(f => ({ ...f, value: v }))} type="number" />} />
            <Txt lb="Observacoes" val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            <SC2 save={save} cancel={() => setModal(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Implantes ────────────────────────────────────────────────
const Implantes = ({ impl, setImpl, patients, dentists }) => {
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ patientId: null, patientName: "", tooth: "", brand: "Titaniofix", model: "", diameter: "", length: "", stage: "Implante", date: today(), dentistId: dentists[0]?.id || 1, notes: "" });

  const list = impl.filter(i => norm(i.patientName || "").includes(norm(q)));
  const save = () => {
    if (!form.patientId && !form.patientName) return alert("Selecione um paciente");
    setImpl(prev => [...prev, { ...form, id: uid() }]);
    setModal(false);
  };

  const BRANDS = ["Titaniofix", "Straumann", "Nobel Biocare", "Neodent", "Bone Fix", "Outro"];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar paciente…"
          style={{ flex: 1, border: "1.5px solid " + G.border, borderRadius: 8, padding: "9px 13px", fontSize: 14, outline: "none" }} />
        <Btn ch="+ Implante" onClick={() => setModal(true)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(im => {
          const pat = patients.find(x => x.id === im.patientId);
          return (
            <Card key={im.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{pat ? pat.name : im.patientName}</div>
                <div style={{ fontSize: 12, color: G.muted }}>Dente {im.tooth} — {im.brand} {im.model}</div>
                <div style={{ fontSize: 12, color: G.muted }}>Ø{im.diameter}mm x {im.length}mm — {fmt(im.date)}</div>
              </div>
              <div>
                <Sel lb="" val={im.stage} set={v => setImpl(prev => prev.map(x => x.id === im.id ? { ...x, stage: v } : x))}
                  opts={IMPL_ST} style={{ minWidth: 120 }} />
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title="Novo Implante" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase" }}>Paciente</label>
              <div style={{ marginTop: 4 }}><AutoPat patients={patients} val={form.patientName} set={v => setForm(f => ({ ...f, patientName: v }))} onSel={p => setForm(f => ({ ...f, patientId: p.id, patientName: p.name }))} /></div>
            </div>
            <R2 a={<Inp lb="Dente" val={form.tooth} set={v => setForm(f => ({ ...f, tooth: v }))} />}
                b={<Sel lb="Etapa" val={form.stage} set={v => setForm(f => ({ ...f, stage: v }))} opts={IMPL_ST} />} />
            <R2 a={<Sel lb="Marca" val={form.brand} set={v => setForm(f => ({ ...f, brand: v }))} opts={BRANDS} />}
                b={<Inp lb="Modelo/Ref" val={form.model} set={v => setForm(f => ({ ...f, model: v }))} />} />
            <R3 a={<Inp lb="Diametro (mm)" val={form.diameter} set={v => setForm(f => ({ ...f, diameter: v }))} />}
                b={<Inp lb="Comprimento (mm)" val={form.length} set={v => setForm(f => ({ ...f, length: v }))} />}
                c={<Inp lb="Data" val={form.date} set={v => setForm(f => ({ ...f, date: v }))} type="date" />} />
            <Txt lb="Observacoes" val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            <SC2 save={save} cancel={() => setModal(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Estoque ───────────────────────────────────────────────────
const Estoque = ({ stock, setStock }) => {
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", category: "Material", qty: "", unit: "un", minQty: "", notes: "" });

  const CATS = ["Material", "Medicamento", "Protese", "Implante", "EPI", "Outro"];
  const list = stock.filter(s => norm(s.name).includes(norm(q)));
  const save = () => {
    if (!form.name) return alert("Nome obrigatorio");
    setStock(prev => [...prev, { ...form, id: uid(), qty: Number(form.qty), minQty: Number(form.minQty) }]);
    setModal(false);
  };
  const adj = (id, delta) => setStock(prev => prev.map(s => s.id === id ? { ...s, qty: Math.max(0, (s.qty || 0) + delta) } : s));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar item…"
          style={{ flex: 1, border: "1.5px solid " + G.border, borderRadius: 8, padding: "9px 13px", fontSize: 14, outline: "none" }} />
        <Btn ch="+ Item" onClick={() => setModal(true)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(s => {
          const low = s.minQty && s.qty <= s.minQty;
          return (
            <Card key={s.id} style={{ display: "flex", gap: 12, alignItems: "center", borderLeft: "4px solid " + (low ? G.red : G.success) }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{s.category} {s.notes ? "— " + s.notes : ""}</div>
                {low && <div style={{ fontSize: 11, color: G.red, fontWeight: 700 }}>⚠️ Estoque baixo</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => adj(s.id, -1)} style={{ width: 28, height: 28, border: "1.5px solid " + G.border, borderRadius: 6, cursor: "pointer", background: "#fff", fontWeight: 700 }}>-</button>
                <span style={{ fontWeight: 700, minWidth: 40, textAlign: "center" }}>{s.qty} {s.unit}</span>
                <button onClick={() => adj(s.id, 1)} style={{ width: 28, height: 28, border: "1.5px solid " + G.border, borderRadius: 6, cursor: "pointer", background: "#fff", fontWeight: 700 }}>+</button>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title="Novo Item" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp lb="Nome do item" val={form.name} set={v => setForm(f => ({ ...f, name: v }))} />
            <R2 a={<Sel lb="Categoria" val={form.category} set={v => setForm(f => ({ ...f, category: v }))} opts={CATS} />}
                b={<Inp lb="Unidade" val={form.unit} set={v => setForm(f => ({ ...f, unit: v }))} />} />
            <R2 a={<Inp lb="Qtde inicial" val={form.qty} set={v => setForm(f => ({ ...f, qty: v }))} type="number" />}
                b={<Inp lb="Minimo alerta" val={form.minQty} set={v => setForm(f => ({ ...f, minQty: v }))} type="number" />} />
            <Txt lb="Observacoes" val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            <SC2 save={save} cancel={() => setModal(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Lembretes ─────────────────────────────────────────────────
const Lembretes = ({ reminders, setReminders, patients, users, user }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", date: today(), patientId: null, patientName: "", assignTo: user.id, priority: "normal", done: false, notes: "" });

  const PRIOS = ["baixa", "normal", "alta", "urgente"];
  const PCOLS = { baixa: G.muted, normal: G.blue, alta: G.orange, urgente: G.red };
  const save = () => {
    if (!form.title) return alert("Descricao obrigatoria");
    setReminders(prev => [...prev, { ...form, id: uid() }]);
    setModal(false);
  };
  const toggle = (id) => setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r));
  const list = [...reminders].sort((a, b) => (a.done === b.done ? a.date.localeCompare(b.date) : a.done ? 1 : -1));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn ch="+ Lembrete" onClick={() => setModal(true)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(r => {
          const u = users.find(x => x.id === r.assignTo);
          return (
            <Card key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", opacity: r.done ? 0.5 : 1, borderLeft: "4px solid " + (u ? u.color : G.primary) }}>
              <button onClick={() => toggle(r.id)}
                style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid " + (r.done ? G.success : G.border), background: r.done ? G.success : "#fff", cursor: "pointer", flexShrink: 0, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                {r.done ? "✓" : ""}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, textDecoration: r.done ? "line-through" : "none" }}>{r.title}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{fmt(r.date)} {r.patientName ? "— " + r.patientName : ""} {u ? "→ " + u.name : ""}</div>
                {r.notes && <div style={{ fontSize: 12, color: G.muted }}>{r.notes}</div>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: PCOLS[r.priority] }}>{r.priority}</span>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title="Novo Lembrete" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp lb="Descricao" val={form.title} set={v => setForm(f => ({ ...f, title: v }))} />
            <R2 a={<Inp lb="Data" val={form.date} set={v => setForm(f => ({ ...f, date: v }))} type="date" />}
                b={<Sel lb="Prioridade" val={form.priority} set={v => setForm(f => ({ ...f, priority: v }))} opts={PRIOS} />} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase" }}>Paciente (opcional)</label>
              <div style={{ marginTop: 4 }}><AutoPat patients={patients} val={form.patientName} set={v => setForm(f => ({ ...f, patientName: v }))} onSel={p => setForm(f => ({ ...f, patientId: p.id, patientName: p.name }))} /></div>
            </div>
            <Sel lb="Responsavel" val={String(form.assignTo)} set={v => setForm(f => ({ ...f, assignTo: Number(v) }))}
              opts={users.map(u => ({ v: String(u.id), l: u.name }))} />
            <Txt lb="Observacoes" val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            <SC2 save={save} cancel={() => setModal(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Receituario ───────────────────────────────────────────────
const MEDS0 = [
  { id: 1, name: "Amoxicilina 500mg", cat: "Antibiotico", posologia: "1 capsula 8/8h por 7 dias" },
  { id: 2, name: "Amoxicilina + Clavulanato 875mg", cat: "Antibiotico", posologia: "1 comprimido 12/12h por 7 dias" },
  { id: 3, name: "Azitromicina 500mg", cat: "Antibiotico", posologia: "1 comprimido 1x/dia por 5 dias" },
  { id: 4, name: "Metronidazol 400mg", cat: "Antibiotico", posologia: "1 comprimido 8/8h por 7 dias" },
  { id: 5, name: "Ibuprofeno 600mg", cat: "Analgesico/Anti-inflamatorio", posologia: "1 comprimido 8/8h por 5 dias apos refeicao" },
  { id: 6, name: "Nimesulida 100mg", cat: "Anti-inflamatorio", posologia: "1 comprimido 12/12h por 5 dias apos refeicao" },
  { id: 7, name: "Paracetamol 750mg", cat: "Analgesico", posologia: "1 comprimido 6/6h se dor" },
  { id: 8, name: "Dipirona 500mg", cat: "Analgesico", posologia: "1 comprimido 6/6h se dor" },
  { id: 9, name: "Diclofenaco 50mg", cat: "Anti-inflamatorio", posologia: "1 comprimido 8/8h por 5 dias" },
  { id: 10, name: "Dexametasona 4mg", cat: "Corticoide", posologia: "1 comprimido 1x/dia por 3 dias" },
  { id: 11, name: "Clorhexidina 0,12%", cat: "Antisseptico", posologia: "Bochechos 3x/dia por 7 dias" },
  { id: 12, name: "Tramadol 50mg", cat: "Analgesico forte", posologia: "1 capsula 6/6h se dor intensa" },
];

const Receituario = ({ patients, dentists, user }) => {
  const [meds, setMeds] = useState(MEDS0);
  const [sel, setSel] = useState([]);
  const [pat, setPat] = useState(null);
  const [patName, setPatName] = useState("");
  const [dentist, setDentist] = useState(dentists.find(d => d.id === user.dentistId) || dentists[0]);
  const [customPos, setCustomPos] = useState({});
  const [newMed, setNewMed] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", cat: "Outro", posologia: "" });

  const toggle = (m) => setSel(prev => prev.some(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m]);
  const isOn = (id) => sel.some(x => x.id === id);

  const print = () => {
    const lines = sel.map((m, i) =>
      (i + 1) + ". " + m.name + "\n   " + (customPos[m.id] || m.posologia)
    ).join("\n\n");
    const dentName = dentist ? dentist.name : "";
    const dentCro = dentist ? dentist.cro : "";
    const w = window.open("", "_blank");
    w.document.write(`<html><body style="font-family:Arial;padding:40px;max-width:600px;margin:auto"> <div style="text-align:center;border-bottom:2px solid #1B5E4A;padding-bottom:12px;margin-bottom:20px"> <h2 style="color:#1B5E4A">Affonso Odontologia</h2> <p style="color:#666">${dentName} — ${dentCro}</p> </div> <h3>Receituario</h3> <p><strong>Paciente:</strong> ${pat ? pat.name : patName}</p> <p><strong>Data:</strong> ${fmt(today())}</p> <hr/> <pre style="font-size:14px;line-height:1.8">${lines}</pre> <div style="margin-top:60px;text-align:center;border-top:1px solid #ccc;padding-top:20px"> <p>_________________________________</p> <p>${dentName}</p> <p>${dentCro}</p> </div> </body></html>`);
    w.document.close();
    w.print();
  };

  const CATS = [...new Set(meds.map(m => m.cat))];

  return (
    <div style={{ padding: 16, maxWidth: 700 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <AutoPat patients={patients} val={patName} set={setPatName} onSel={p => { setPat(p); setPatName(p.name); }} placeholder="Selecionar paciente…" />
        </div>
        <Btn ch="+ Medicacao" v="g" onClick={() => setNewMed(true)} />
        {sel.length > 0 && <Btn ch={"Imprimir (" + sel.length + ")"} onClick={print} />}
      </div>
      {CATS.map(cat => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", marginBottom: 6 }}>{cat}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {meds.filter(m => m.cat === cat).map(m => (
              <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", border: "1.5px solid " + (isOn(m.id) ? G.primary : G.border), borderRadius: 10, cursor: "pointer", background: isOn(m.id) ? G.accent : "#fff" }}
                onClick={() => toggle(m)}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: "2px solid " + (isOn(m.id) ? G.primary : G.border), background: isOn(m.id) ? G.primary : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>
                  {isOn(m.id) ? "✓" : ""}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  {isOn(m.id)
                    ? <input value={customPos[m.id] !== undefined ? customPos[m.id] : m.posologia}
                        onChange={e => { e.stopPropagation(); setCustomPos(p => ({ ...p, [m.id]: e.target.value })); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: "100%", border: "1px solid " + G.border, borderRadius: 6, padding: "4px 8px", fontSize: 12, marginTop: 4 }} />
                    : <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{m.posologia}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {newMed && (
        <Modal title="Nova Medicacao" onClose={() => setNewMed(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp lb="Nome" val={newForm.name} set={v => setNewForm(f => ({ ...f, name: v }))} />
            <Inp lb="Categoria" val={newForm.cat} set={v => setNewForm(f => ({ ...f, cat: v }))} />
            <Txt lb="Posologia padrao" val={newForm.posologia} set={v => setNewForm(f => ({ ...f, posologia: v }))} rows={2} />
            <SC2 save={() => { setMeds(prev => [...prev, { ...newForm, id: uid() }]); setNewMed(false); }} cancel={() => setNewMed(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Configuracoes ─────────────────────────────────────────────
const Configuracoes = ({ users, setUsers, dentists, setDentists, user }) => {
  const [tab, setTab] = useState("usuarios");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  if (user.level < 2) return <div style={{ padding: 20, color: G.muted }}>Acesso restrito.</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["usuarios", "dentistas"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 18px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: tab === t ? 700 : 400,
              background: tab === t ? G.primary : G.accent, color: tab === t ? "#fff" : G.text, fontSize: 13, textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>
      {tab === "usuarios" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <Btn ch="+ Usuario" onClick={() => { setForm({ name: "", role: "Recepcionista", level: 2, login: "", pass: "1234", dentistId: null, color: UCOLS[0], active: true }); setModal("newUser"); }} />
          </div>
          {users.map(u => (
            <Card key={u.id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 10, height: 40, borderRadius: 4, background: u.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{u.role} — @{u.login}</div>
              </div>
              <span style={{ fontSize: 11, color: u.active ? G.success : G.red, fontWeight: 700 }}>{u.active ? "Ativo" : "Inativo"}</span>
            </Card>
          ))}
        </div>
      )}
      {tab === "dentistas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <Btn ch="+ Dentista" onClick={() => { setForm({ name: "", cro: "", specialty: "", phone: "", email: "", color: UCOLS[0], pct: 50 }); setModal("newDentist"); }} />
          </div>
          {dentists.map(d => (
            <Card key={d.id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 10, height: 40, borderRadius: 4, background: d.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: G.muted }}>{d.cro} — {d.specialty}</div>
              </div>
              <div style={{ fontSize: 13, color: G.muted }}>{d.pct}%</div>
            </Card>
          ))}
        </div>
      )}
      {modal === "newUser" && (
        <Modal title="Novo Usuario" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp lb="Nome completo" val={form.name} set={v => setForm(f => ({ ...f, name: v }))} />
            <R2 a={<Inp lb="Login" val={form.login} set={v => setForm(f => ({ ...f, login: v }))} />}
                b={<Inp lb="Senha" val={form.pass} set={v => setForm(f => ({ ...f, pass: v }))} type="password" />} />
            <Sel lb="Funcao" val={form.role} set={v => setForm(f => ({ ...f, role: v }))} opts={["Admin", "Dentista", "Recepcionista"]} />
            <SC2 save={() => { setUsers(prev => [...prev, { ...form, id: uid(), level: form.role === "Admin" ? 3 : form.role === "Dentista" ? 1 : 2 }]); setModal(null); }} cancel={() => setModal(null)} />
          </div>
        </Modal>
      )}
      {modal === "newDentist" && (
        <Modal title="Novo Dentista" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp lb="Nome completo" val={form.name} set={v => setForm(f => ({ ...f, name: v }))} />
            <R2 a={<Inp lb="CRO" val={form.cro} set={v => setForm(f => ({ ...f, cro: v }))} />}
                b={<Inp lb="Especialidade" val={form.specialty} set={v => setForm(f => ({ ...f, specialty: v }))} />} />
            <R2 a={<Inp lb="Telefone" val={form.phone} set={v => setForm(f => ({ ...f, phone: v }))} />}
                b={<Inp lb="Percentual (%)" val={form.pct} set={v => setForm(f => ({ ...f, pct: v }))} type="number" />} />
            <SC2 save={() => { setDentists(prev => [...prev, { ...form, id: uid() }]); setModal(null); }} cancel={() => setModal(null)} />
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── App Principal ─────────────────────────────────────────────
export default function App() {
  useEffect(() => { injectCSS(); }, []);

  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [mobile, setMobile] = useState(window.innerWidth < 700);

  useEffect(() => {
    const handle = () => setMobile(window.innerWidth < 700);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // State com persistencia
  const [users, setUsersRaw] = useState(() => LS.get("aff_users", USERS0));
  const [dentists, setDentistsRaw] = useState(() => LS.get("aff_dentists", DENTISTS0));
  const [patients, setPatientsRaw] = useState(() => LS.get("aff_patients", []));
  const [appts, setApptsRaw] = useState(() => LS.get("aff_appts", []));
  const [recs, setRecsRaw] = useState(() => LS.get("aff_recs", []));
  const [pros, setProsRaw] = useState(() => LS.get("aff_pros", []));
  const [impl, setImplRaw] = useState(() => LS.get("aff_impl", []));
  const [stock, setStockRaw] = useState(() => LS.get("aff_stock", []));
  const [reminders, setRemindersRaw] = useState(() => LS.get("aff_reminders", []));

  const wrap = (key, raw, setter) => {
    const set = (val) => {
      if (typeof val === "function") {
        setter(prev => {
          const next = val(prev);
          LS.set(key, next);
          return next;
        });
      } else {
        LS.set(key, val);
        setter(val);
      }
    };
    return [raw, set];
  };

  const [u, setUsers] = wrap("aff_users", users, setUsersRaw);
  const [dn, setDentists] = wrap("aff_dentists", dentists, setDentistsRaw);
  const [pa, setPatients] = wrap("aff_patients", patients, setPatientsRaw);
  const [ap, setAppts] = wrap("aff_appts", appts, setApptsRaw);
  const [re, setRecs] = wrap("aff_recs", recs, setRecsRaw);
  const [pr, setPros] = wrap("aff_pros", pros, setProsRaw);
  const [im, setImpl] = wrap("aff_impl", impl, setImplRaw);
  const [st, setStock] = wrap("aff_stock", stock, setStockRaw);
  const [rm, setReminders] = wrap("aff_reminders", reminders, setRemindersRaw);

  if (!user) return <Login users={users} onLogin={setUser} />;

  const pages = {
    dashboard: <Dashboard appts={ap} patients={pa} recs={re} reminders={rm} user={user} setPage={setPage} />,
    agenda: <Agenda appts={ap} setAppts={setAppts} patients={pa} dentists={dn} user={user} />,
    pacientes: <Pacientes patients={pa} setPatients={setPatients} appts={ap} recs={re} />,
    financeiro: <Financeiro recs={re} setRecs={setRecs} patients={pa} appts={ap} dentists={dn} />,
    proteses: <Proteses pros={pr} setPros={setPros} patients={pa} dentists={dn} />,
    implantes: <Implantes impl={im} setImpl={setImpl} patients={pa} dentists={dn} />,
    estoque: <Estoque stock={st} setStock={setStock} />,
    lembretes: <Lembretes reminders={rm} setReminders={setReminders} patients={pa} users={u} user={user} />,
    receituario: <Receituario patients={pa} dentists={dn} user={user} />,
    configuracoes: <Configuracoes users={u} setUsers={setUsers} dentists={dn} setDentists={setDentists} user={user} />,
  };

  const titleMap = {
    dashboard: "Dashboard", agenda: "Agenda", pacientes: "Pacientes", financeiro: "Financeiro",
    proteses: "Proteses", implantes: "Implantes", estoque: "Estoque", lembretes: "Lembretes",
    receituario: "Receituario", configuracoes: "Configuracoes"
  };

  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column-reverse" : "row", minHeight: "100vh" }}>
      <Sidebar page={page} setPage={setPage} user={user} onLogout={() => setUser(null)} mobile={mobile} />
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ padding: "14px 18px", background: G.card, borderBottom: "1px solid " + G.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 20, color: G.primary, fontWeight: 700 }}>{titleMap[page]}</h1>
          <div style={{ fontSize: 12, color: G.muted }}>{user.name}</div>
        </div>
        <div className="fi">{pages[page]}</div>
      </div>
    </div>
  );
}
