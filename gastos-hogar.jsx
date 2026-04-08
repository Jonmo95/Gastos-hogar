import { useState, useEffect, useCallback } from "react";

const DEFAULT_CATEGORIES = [
  { id: "luz", name: "Luz", icon: "⚡", color: "#F59E0B" },
  { id: "agua", name: "Agua", icon: "💧", color: "#3B82F6" },
  { id: "gas", name: "Gas", icon: "🔥", color: "#EF4444" },
  { id: "telefono", name: "Teléfono", icon: "📱", color: "#8B5CF6" },
  { id: "comunidad", name: "Comunidad", icon: "🏘️", color: "#10B981" },
  { id: "gimnasio", name: "Gimnasio", icon: "🏋️", color: "#F97316" },
  { id: "seguro_casa", name: "Seguro Casa", icon: "🏠", color: "#06B6D4" },
  { id: "seguro_coche", name: "Seguro Coche", icon: "🚗", color: "#84CC16" },
  { id: "combustible", name: "Combustible", icon: "⛽", color: "#64748B" },
  { id: "pena", name: "Peña", icon: "🎭", color: "#EC4899" },
  { id: "comida", name: "Comida", icon: "🛒", color: "#14B8A6" },
  { id: "otros", name: "Otros Gastos", icon: "📦", color: "#94A3B8" },
];

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatEur(val) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(val || 0);
}

const STORAGE_KEY = "gastos_hogar_v1";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { expenses: [], categories: DEFAULT_CATEGORIES, monthlyBudget: 900, monthlyIncomes: {} };
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [view, setView] = useState("dashboard"); // dashboard | add | history | analytics | settings
  const [addForm, setAddForm] = useState({ categoryId: "", amount: "", note: "", date: new Date().toISOString().slice(0,10), recurring: "once" });
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [compareMode, setCompareMode] = useState("months"); // months | years
  const [compareYear1, setCompareYear1] = useState(new Date().getFullYear());
  const [compareYear2, setCompareYear2] = useState(new Date().getFullYear() - 1);
  const [compareMonth, setCompareMonth] = useState(new Date().getMonth());
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📌");
  const [editBudget, setEditBudget] = useState("");
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [historyFilter, setHistoryFilter] = useState({ year: new Date().getFullYear(), month: -1, cat: "" });

  const persist = useCallback((newData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Derived
  const years = [...new Set(data.expenses.map(e => new Date(e.date).getFullYear()))].sort();
  if (!years.includes(new Date().getFullYear())) years.push(new Date().getFullYear());

  function expensesFor(year, month) {
    return data.expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && (month === -1 || d.getMonth() === month);
    });
  }

  function totalFor(year, month) {
    return expensesFor(year, month).reduce((s, e) => s + e.amount, 0);
  }

  function catTotalFor(catId, year, month) {
    return expensesFor(year, month).filter(e => e.categoryId === catId).reduce((s, e) => s + e.amount, 0);
  }

  function getCat(id) {
    return data.categories.find(c => c.id === id) || { name: id, icon: "❓", color: "#888" };
  }

  // Current month income (available)
  const currentIncome = data.monthlyBudget;

  // Add expense
  function handleAdd(e) {
    e.preventDefault();
    if (!addForm.categoryId || !addForm.amount || isNaN(parseFloat(addForm.amount))) {
      showToast("Completa categoría e importe", "err"); return;
    }
    const expense = {
      id: Date.now() + Math.random(),
      categoryId: addForm.categoryId,
      amount: parseFloat(addForm.amount),
      note: addForm.note,
      date: addForm.date,
      recurring: addForm.recurring,
    };
    persist({ ...data, expenses: [...data.expenses, expense] });
    setAddForm({ categoryId: "", amount: "", note: "", date: new Date().toISOString().slice(0,10), recurring: "once" });
    showToast("Gasto añadido ✓");
  }

  function handleDelete(id) {
    persist({ ...data, expenses: data.expenses.filter(e => e.id !== id) });
    setDeleteConfirm(null);
    showToast("Gasto eliminado");
  }

  function handleAddCategory() {
    if (!newCatName.trim()) return;
    const id = newCatName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const colors = ["#A855F7","#22D3EE","#FB7185","#4ADE80","#FACC15","#F97316"];
    const cat = { id, name: newCatName.trim(), icon: newCatIcon, color: colors[data.categories.length % colors.length] };
    persist({ ...data, categories: [...data.categories, cat] });
    setNewCatName(""); setNewCatIcon("📌");
    showToast("Categoría añadida");
  }

  // ─── VIEWS ────────────────────────────────────────────────────────────────────

  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth();
  const monthTotal = totalFor(thisYear, thisMonth);
  const yearTotal = totalFor(thisYear, -1);
  const remaining = currentIncome - monthTotal;

  // History filtered
  const histFiltered = data.expenses.filter(e => {
    const d = new Date(e.date);
    return (historyFilter.year === -1 || d.getFullYear() === historyFilter.year)
      && (historyFilter.month === -1 || d.getMonth() === historyFilter.month)
      && (!historyFilter.cat || e.categoryId === historyFilter.cat);
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={styles.root}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "err" ? "#EF4444" : "#10B981" }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <p style={{ color: "#F1F5F9", marginBottom: 16, fontSize: 15 }}>¿Eliminar este gasto?</p>
            <div style={{ display:"flex", gap:10 }}>
              <button style={styles.btnDanger} onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
              <button style={styles.btnSecondary} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <span style={styles.logo}>🏡 GastosHogar</span>
          <nav style={styles.nav}>
            {[
              { id:"dashboard", label:"Inicio", icon:"📊" },
              { id:"add", label:"Añadir", icon:"➕" },
              { id:"history", label:"Histórico", icon:"📋" },
              { id:"analytics", label:"Análisis", icon:"📈" },
              { id:"settings", label:"Ajustes", icon:"⚙️" },
            ].map(v => (
              <button key={v.id} style={{ ...styles.navBtn, ...(view === v.id ? styles.navBtnActive : {}) }}
                onClick={() => setView(v.id)}>
                <span style={{ fontSize:14 }}>{v.icon}</span>
                <span style={{ fontSize:11 }}>{v.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={styles.main}>

        {/* ── DASHBOARD ── */}
        {view === "dashboard" && (
          <div>
            <h2 style={styles.pageTitle}>{MONTH_NAMES[thisMonth]} {thisYear}</h2>
            {/* KPI Cards */}
            <div style={styles.kpiGrid}>
              <KPICard label="Gastado este mes" value={formatEur(monthTotal)} sub={`de ${formatEur(currentIncome)} presupuesto`} accent="#F59E0B" />
              <KPICard label="Disponible" value={formatEur(remaining)} sub="resto del mes" accent={remaining >= 0 ? "#10B981" : "#EF4444"} />
              <KPICard label="Total año" value={formatEur(yearTotal)} sub={`${thisYear}`} accent="#8B5CF6" />
              <KPICard label="Gastos este mes" value={expensesFor(thisYear,thisMonth).length} sub="registros" accent="#3B82F6" unit="" />
            </div>

            {/* Budget bar */}
            <div style={styles.card}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={styles.cardLabel}>Presupuesto mensual</span>
                <span style={{ color:"#94A3B8", fontSize:12 }}>{Math.round((monthTotal/currentIncome)*100)}%</span>
              </div>
              <div style={styles.barBg}>
                <div style={{ ...styles.barFill, width:`${Math.min((monthTotal/currentIncome)*100,100)}%`,
                  background: monthTotal > currentIncome ? "#EF4444" : "#10B981" }} />
              </div>
            </div>

            {/* Category breakdown */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Desglose por categoría · {MONTH_NAMES[thisMonth]}</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {data.categories.map(cat => {
                  const total = catTotalFor(cat.id, thisYear, thisMonth);
                  if (total === 0) return null;
                  const pct = monthTotal > 0 ? (total/monthTotal)*100 : 0;
                  return (
                    <div key={cat.id}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ color:"#CBD5E1", fontSize:13 }}>{cat.icon} {cat.name}</span>
                        <span style={{ color:"#F1F5F9", fontSize:13, fontWeight:600 }}>{formatEur(total)}</span>
                      </div>
                      <div style={styles.barBg}>
                        <div style={{ ...styles.barFill, width:`${pct}%`, background: cat.color, opacity:0.85 }} />
                      </div>
                    </div>
                  );
                })}
                {expensesFor(thisYear,thisMonth).length === 0 && (
                  <p style={{ color:"#475569", textAlign:"center", padding:"20px 0" }}>Sin gastos este mes aún</p>
                )}
              </div>
            </div>

            {/* Last expenses */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Últimos movimientos</h3>
              {data.expenses.slice().sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,8).map(e => {
                const cat = getCat(e.categoryId);
                return (
                  <div key={e.id} style={styles.expenseRow}>
                    <span style={{ fontSize:20 }}>{cat.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:"#F1F5F9", fontSize:13, fontWeight:500 }}>{cat.name}</div>
                      {e.note && <div style={{ color:"#64748B", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.note}</div>}
                      <div style={{ color:"#475569", fontSize:11 }}>{e.date}</div>
                    </div>
                    <span style={{ color: cat.color, fontWeight:700, fontSize:14 }}>{formatEur(e.amount)}</span>
                  </div>
                );
              })}
              {data.expenses.length === 0 && <p style={{ color:"#475569", textAlign:"center", padding:"16px 0" }}>Sin gastos registrados</p>}
            </div>
          </div>
        )}

        {/* ── ADD EXPENSE ── */}
        {view === "add" && (
          <div>
            <h2 style={styles.pageTitle}>Registrar Gasto</h2>
            <div style={styles.card}>
              <form onSubmit={handleAdd} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {/* Category grid */}
                <div>
                  <label style={styles.label}>Categoría *</label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:6 }}>
                    {data.categories.map(cat => (
                      <button type="button" key={cat.id}
                        onClick={() => setAddForm(f => ({ ...f, categoryId: cat.id }))}
                        style={{
                          ...styles.catBtn,
                          border: addForm.categoryId === cat.id ? `2px solid ${cat.color}` : "2px solid #1E293B",
                          background: addForm.categoryId === cat.id ? cat.color + "22" : "#0F172A",
                        }}>
                        <span style={{ fontSize:18 }}>{cat.icon}</span>
                        <span style={{ fontSize:10, color:"#CBD5E1", marginTop:2, lineHeight:1.2 }}>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={styles.label}>Importe (€) *</label>
                    <input style={styles.input} type="number" step="0.01" min="0" placeholder="0.00"
                      value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label style={styles.label}>Fecha *</label>
                    <input style={styles.input} type="date"
                      value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Nota (opcional)</label>
                  <input style={styles.input} type="text" placeholder="Ej: Factura bimestral agosto..."
                    value={addForm.note} onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))} />
                </div>

                <div>
                  <label style={styles.label}>Periodicidad</label>
                  <select style={styles.input} value={addForm.recurring}
                    onChange={e => setAddForm(f => ({ ...f, recurring: e.target.value }))}>
                    <option value="once">Puntual</option>
                    <option value="monthly">Mensual</option>
                    <option value="bimonthly">Bimestral</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="biannual">Semestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>

                <button type="submit" style={styles.btnPrimary}>Registrar Gasto</button>
              </form>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {view === "history" && (
          <div>
            <h2 style={styles.pageTitle}>Histórico de Gastos</h2>
            {/* Filters */}
            <div style={{ ...styles.card, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, padding:14 }}>
              <div>
                <label style={styles.label}>Año</label>
                <select style={styles.input} value={historyFilter.year}
                  onChange={e => setHistoryFilter(f => ({ ...f, year: parseInt(e.target.value) }))}>
                  <option value={-1}>Todos</option>
                  {[2019,2020,2021,2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Mes</label>
                <select style={styles.input} value={historyFilter.month}
                  onChange={e => setHistoryFilter(f => ({ ...f, month: parseInt(e.target.value) }))}>
                  <option value={-1}>Todos</option>
                  {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Categoría</label>
                <select style={styles.input} value={historyFilter.cat}
                  onChange={e => setHistoryFilter(f => ({ ...f, cat: e.target.value }))}>
                  <option value="">Todas</option>
                  {data.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ ...styles.card, padding:0, overflow:"hidden" }}>
              <div style={{ padding:"12px 16px", borderBottom:"1px solid #1E293B", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:"#94A3B8", fontSize:12 }}>{histFiltered.length} registros</span>
                <span style={{ color:"#F59E0B", fontWeight:700 }}>{formatEur(histFiltered.reduce((s,e)=>s+e.amount,0))}</span>
              </div>
              {histFiltered.length === 0 && (
                <p style={{ color:"#475569", textAlign:"center", padding:"32px 0" }}>Sin resultados</p>
              )}
              {histFiltered.map(e => {
                const cat = getCat(e.categoryId);
                return (
                  <div key={e.id} style={{ ...styles.expenseRow, padding:"12px 16px", borderBottom:"1px solid #0F172A" }}>
                    <span style={{ fontSize:20 }}>{cat.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:"#F1F5F9", fontSize:13, fontWeight:500 }}>{cat.name}</div>
                      {e.note && <div style={{ color:"#64748B", fontSize:11 }}>{e.note}</div>}
                      <div style={{ color:"#475569", fontSize:11 }}>{e.date} · {e.recurring !== "once" ? e.recurring : "puntual"}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ color: cat.color, fontWeight:700, fontSize:14 }}>{formatEur(e.amount)}</span>
                      <button style={styles.deleteBtn} onClick={() => setDeleteConfirm(e.id)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {view === "analytics" && (
          <div>
            <h2 style={styles.pageTitle}>Análisis y Comparativas</h2>

            {/* Mode selector */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {[{id:"months",label:"Meses del año"},{id:"years",label:"Entre años"},{id:"catYear",label:"Por categoría/año"}].map(m => (
                <button key={m.id} style={{ ...styles.tabBtn, ...(compareMode===m.id?styles.tabBtnActive:{}) }}
                  onClick={() => setCompareMode(m.id)}>{m.label}</button>
              ))}
            </div>

            {/* Monthly view */}
            {compareMode === "months" && (
              <div>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                  <select style={{ ...styles.input, width:"auto" }} value={filterYear}
                    onChange={e => setFilterYear(parseInt(e.target.value))}>
                    {[2019,2020,2021,2022,2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Gasto mensual {filterYear}</h3>
                  {MONTHS.map((m, i) => {
                    const tot = totalFor(filterYear, i);
                    const maxVal = Math.max(...MONTHS.map((_,j) => totalFor(filterYear, j)), 1);
                    return (
                      <div key={i} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ color:"#94A3B8", fontSize:12, width:30 }}>{m}</span>
                          <span style={{ color: tot > currentIncome ? "#EF4444" : "#CBD5E1", fontSize:12, fontWeight:600 }}>{formatEur(tot)}</span>
                        </div>
                        <div style={styles.barBg}>
                          <div style={{ ...styles.barFill, width:`${(tot/maxVal)*100}%`,
                            background: tot > currentIncome ? "#EF4444" : "#3B82F6" }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #1E293B", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:"#94A3B8", fontSize:12 }}>Total anual</span>
                    <span style={{ color:"#F59E0B", fontWeight:700 }}>{formatEur(totalFor(filterYear,-1))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Year comparison */}
            {compareMode === "years" && (
              <div>
                <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                  <select style={{ ...styles.input, width:"auto" }} value={compareYear1}
                    onChange={e => setCompareYear1(parseInt(e.target.value))}>
                    {[2019,2020,2021,2022,2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                  <span style={{ color:"#475569", alignSelf:"center" }}>vs</span>
                  <select style={{ ...styles.input, width:"auto" }} value={compareYear2}
                    onChange={e => setCompareYear2(parseInt(e.target.value))}>
                    {[2019,2020,2021,2022,2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>{compareYear1} vs {compareYear2} — por mes</h3>
                  {MONTHS.map((m, i) => {
                    const t1 = totalFor(compareYear1, i);
                    const t2 = totalFor(compareYear2, i);
                    const maxVal = Math.max(t1, t2, 1);
                    const diff = t1 - t2;
                    return (
                      <div key={i} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ color:"#94A3B8", fontSize:12 }}>{m}</span>
                          <span style={{ color: diff > 0 ? "#EF4444" : diff < 0 ? "#10B981" : "#475569", fontSize:11, fontWeight:600 }}>
                            {diff > 0 ? "+" : ""}{formatEur(diff)}
                          </span>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <span style={{ color:"#8B5CF6", fontSize:10, width:28 }}>{compareYear1}</span>
                            <div style={{ flex:1, ...styles.barBg, height:8 }}>
                              <div style={{ ...styles.barFill, width:`${(t1/maxVal)*100}%`, height:8, background:"#8B5CF6" }} />
                            </div>
                            <span style={{ color:"#CBD5E1", fontSize:10, width:60, textAlign:"right" }}>{formatEur(t1)}</span>
                          </div>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <span style={{ color:"#F59E0B", fontSize:10, width:28 }}>{compareYear2}</span>
                            <div style={{ flex:1, ...styles.barBg, height:8 }}>
                              <div style={{ ...styles.barFill, width:`${(t2/maxVal)*100}%`, height:8, background:"#F59E0B" }} />
                            </div>
                            <span style={{ color:"#CBD5E1", fontSize:10, width:60, textAlign:"right" }}>{formatEur(t2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #1E293B" }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:"#8B5CF6", fontWeight:600 }}>{compareYear1}: {formatEur(totalFor(compareYear1,-1))}</span>
                      <span style={{ color:"#F59E0B", fontWeight:600 }}>{compareYear2}: {formatEur(totalFor(compareYear2,-1))}</span>
                    </div>
                    <div style={{ textAlign:"center", marginTop:8, color: totalFor(compareYear1,-1) > totalFor(compareYear2,-1) ? "#EF4444" : "#10B981", fontWeight:700 }}>
                      Diferencia anual: {formatEur(totalFor(compareYear1,-1) - totalFor(compareYear2,-1))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* By category per year */}
            {compareMode === "catYear" && (
              <div>
                <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                  <select style={{ ...styles.input, width:"auto" }} value={filterYear}
                    onChange={e => setFilterYear(parseInt(e.target.value))}>
                    {[2019,2020,2021,2022,2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Categorías en {filterYear}</h3>
                  {data.categories.map(cat => {
                    const tot = catTotalFor(cat.id, filterYear, -1);
                    if (tot === 0) return null;
                    const annualTotal = totalFor(filterYear, -1) || 1;
                    return (
                      <div key={cat.id} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ color:"#CBD5E1", fontSize:13 }}>{cat.icon} {cat.name}</span>
                          <div style={{ textAlign:"right" }}>
                            <span style={{ color: cat.color, fontWeight:700, fontSize:13 }}>{formatEur(tot)}</span>
                            <span style={{ color:"#475569", fontSize:10, marginLeft:6 }}>{Math.round((tot/annualTotal)*100)}%</span>
                          </div>
                        </div>
                        <div style={styles.barBg}>
                          <div style={{ ...styles.barFill, width:`${(tot/annualTotal)*100}%`, background: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Same month compare across years */}
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Mismo mes en diferentes años</h3>
                  <div style={{ marginBottom:10 }}>
                    <select style={styles.input} value={compareMonth}
                      onChange={e => setCompareMonth(parseInt(e.target.value))}>
                      {MONTH_NAMES.map((m,i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                  </div>
                  {[2019,2020,2021,2022,2023,2024,2025,2026].map(y => {
                    const tot = totalFor(y, compareMonth);
                    const maxVal = Math.max(...[2019,2020,2021,2022,2023,2024,2025,2026].map(yr => totalFor(yr, compareMonth)), 1);
                    if (tot === 0) return null;
                    return (
                      <div key={y} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ color:"#94A3B8", fontSize:12 }}>{y}</span>
                          <span style={{ color:"#CBD5E1", fontSize:12, fontWeight:600 }}>{formatEur(tot)}</span>
                        </div>
                        <div style={styles.barBg}>
                          <div style={{ ...styles.barFill, width:`${(tot/maxVal)*100}%`, background:"#6366F1" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {view === "settings" && (
          <div>
            <h2 style={styles.pageTitle}>Ajustes</h2>

            {/* Budget */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Presupuesto mensual</h3>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <input style={{ ...styles.input, flex:1 }} type="number" placeholder={data.monthlyBudget}
                  value={editBudget} onChange={e => setEditBudget(e.target.value)} />
                <button style={styles.btnPrimary} onClick={() => {
                  if (editBudget && !isNaN(parseFloat(editBudget))) {
                    persist({ ...data, monthlyBudget: parseFloat(editBudget) });
                    setEditBudget(""); showToast("Presupuesto actualizado");
                  }
                }}>Guardar</button>
              </div>
              <p style={{ color:"#475569", fontSize:11, marginTop:6 }}>Actual: {formatEur(data.monthlyBudget)}/mes</p>
            </div>

            {/* Add category */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Añadir categoría</h3>
              <div style={{ display:"flex", gap:10 }}>
                <input style={{ ...styles.input, width:60 }} type="text" placeholder="🏷️" maxLength={2}
                  value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} />
                <input style={{ ...styles.input, flex:1 }} type="text" placeholder="Nombre de categoría"
                  value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                <button style={styles.btnPrimary} onClick={handleAddCategory}>+</button>
              </div>
            </div>

            {/* Categories list */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Categorías ({data.categories.length})</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {data.categories.map(cat => (
                  <div key={cat.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 10px",
                    background:"#0F172A", borderRadius:8, border:`1px solid ${cat.color}33` }}>
                    <span>{cat.icon}</span>
                    <span style={{ color:"#CBD5E1", fontSize:12, flex:1 }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Estadísticas generales</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  ["Total registros", data.expenses.length],
                  ["Gasto total histórico", formatEur(data.expenses.reduce((s,e)=>s+e.amount,0))],
                  ["Años con datos", [...new Set(data.expenses.map(e=>new Date(e.date).getFullYear()))].sort().join(", ") || "—"],
                  ["Categorías", data.categories.length],
                ].map(([label, val]) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #1E293B" }}>
                    <span style={{ color:"#64748B", fontSize:12 }}>{label}</span>
                    <span style={{ color:"#CBD5E1", fontSize:12, fontWeight:600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export/Import */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Datos</h3>
              <div style={{ display:"flex", gap:10 }}>
                <button style={styles.btnSecondary} onClick={() => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                  a.download = "gastos_hogar.json"; a.click();
                }}>📥 Exportar JSON</button>
                <label style={{ ...styles.btnSecondary, cursor:"pointer" }}>
                  📤 Importar JSON
                  <input type="file" accept=".json" style={{ display:"none" }} onChange={e => {
                    const file = e.target.files[0]; if (!file) return;
                    const r = new FileReader(); r.onload = ev => {
                      try {
                        const imported = JSON.parse(ev.target.result);
                        if (imported.expenses) { persist(imported); showToast("Datos importados"); }
                        else showToast("Formato inválido", "err");
                      } catch { showToast("Error al importar", "err"); }
                    }; r.readAsText(file);
                  }} />
                </label>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function KPICard({ label, value, sub, accent, unit = "€" }) {
  return (
    <div style={{ ...styles.card, padding:"14px 16px", borderLeft:`3px solid ${accent}` }}>
      <div style={{ color:"#64748B", fontSize:11, marginBottom:4 }}>{label}</div>
      <div style={{ color: accent, fontSize:22, fontWeight:800, lineHeight:1 }}>{value}</div>
      <div style={{ color:"#475569", fontSize:10, marginTop:4 }}>{sub}</div>
    </div>
  );
}

const styles = {
  root: {
    background: "#0A0F1A",
    minHeight: "100vh",
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    color: "#F1F5F9",
    paddingBottom: 24,
  },
  header: {
    background: "#0D1424",
    borderBottom: "1px solid #1E293B",
    position: "sticky", top: 0, zIndex: 100,
  },
  headerInner: {
    maxWidth: 680, margin: "0 auto", padding: "0 16px",
    display: "flex", justifyContent: "space-between", alignItems: "center", height: 52,
  },
  logo: { color: "#F1F5F9", fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" },
  nav: { display: "flex", gap: 2 },
  navBtn: {
    background: "none", border: "none", color: "#475569", cursor: "pointer",
    padding: "6px 10px", borderRadius: 8, display: "flex", flexDirection: "column",
    alignItems: "center", gap: 2, transition: "all 0.15s",
  },
  navBtnActive: { background: "#1E293B", color: "#F1F5F9" },
  main: { maxWidth: 680, margin: "0 auto", padding: "20px 16px" },
  pageTitle: { fontSize: 20, fontWeight: 800, color: "#F1F5F9", marginBottom: 16, letterSpacing: "-0.5px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  card: {
    background: "#0D1424", border: "1px solid #1E293B", borderRadius: 12,
    padding: "16px", marginBottom: 12,
  },
  cardTitle: { color: "#94A3B8", fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" },
  cardLabel: { color: "#64748B", fontSize: 12 },
  barBg: { background: "#1E293B", borderRadius: 99, height: 6, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 99, transition: "width 0.5s ease" },
  expenseRow: {
    display: "flex", gap: 10, alignItems: "center", padding: "8px 0",
    borderBottom: "1px solid #0F172A",
  },
  label: { color: "#64748B", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" },
  input: {
    background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, color: "#F1F5F9",
    padding: "10px 12px", fontSize: 14, width: "100%", boxSizing: "border-box",
    outline: "none",
  },
  catBtn: {
    borderRadius: 10, padding: "10px 6px", display: "flex", flexDirection: "column",
    alignItems: "center", cursor: "pointer", transition: "all 0.15s",
  },
  btnPrimary: {
    background: "#3B82F6", border: "none", borderRadius: 8, color: "#fff",
    padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  btnSecondary: {
    background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#CBD5E1",
    padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  btnDanger: {
    background: "#EF4444", border: "none", borderRadius: 8, color: "#fff",
    padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  deleteBtn: {
    background: "none", border: "none", color: "#EF4444", cursor: "pointer",
    fontSize: 14, padding: "2px 4px", opacity: 0.6,
  },
  tabBtn: {
    background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, color: "#64748B",
    padding: "8px 12px", fontSize: 12, cursor: "pointer", fontWeight: 500,
  },
  tabBtnActive: { background: "#1E293B", color: "#F1F5F9", borderColor: "#334155" },
  toast: {
    position: "fixed", top: 16, right: 16, zIndex: 999,
    padding: "10px 18px", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13,
    boxShadow: "0 4px 20px #0008",
  },
  overlay: {
    position: "fixed", inset: 0, background: "#000a", zIndex: 200,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: "#0D1424", border: "1px solid #1E293B", borderRadius: 14,
    padding: "24px", minWidth: 260,
  },
};
