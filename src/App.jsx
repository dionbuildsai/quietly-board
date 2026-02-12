import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import {
  VISION_90, YEAR_GOAL, NORTH_STAR, EXPERIMENTS_META, START_DATE,
  ROADMAP, metrics, catColors, experimentBank
} from "./data";

const STORE_KEY = "quietly-board-v12";

// ============ HELPERS ============
const getWeekKey = () => {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
};

const getDaysSinceStart = () => Math.max(0, Math.floor((new Date() - new Date(START_DATE)) / 86400000));

const defaultData = {
  tasks: [],
  completed: [],
  scores: {},
  northStar: {},
  experiments: {},
  expDone: {},
  archive: {},
  reflections: {},
  topPriorities: {},
  blockers: {},
};

// ============ MAIN COMPONENT ============
export default function App() {
  const [data, setData] = useState(defaultData);
  const [tab, setTab] = useState("today");
  const [view, setView] = useState("all");
  const [lastSync, setLastSync] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("offline");
  
  // Track if we need to save (only true after user action)
  const needsSave = useRef(false);
  const saveTimeout = useRef(null);
  
  const weekKey = getWeekKey();
  const day = getDaysSinceStart();
  const phase = day < 14 ? 1 : day < 45 ? 2 : 3;
  const inputRef = useRef(null);

  // ========== SAVE FUNCTION ==========
  const saveToSupabase = useCallback(async (dataToSave) => {
    if (!isSupabaseConfigured()) return;
    
    try {
      setSyncStatus("syncing");
      const { error } = await supabase
        .from('board_data')
        .upsert({ id: 'main', data: dataToSave, updated_at: new Date().toISOString() });
      
      if (error) throw error;
      setLastSync(new Date());
      setSyncStatus("synced");
    } catch (e) {
      console.error("Supabase save failed:", e);
      setSyncStatus("error");
    }
  }, []);

  // ========== LOAD ON MOUNT ==========
  useEffect(() => {
    const loadData = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data: rows, error } = await supabase
            .from('board_data')
            .select('*')
            .eq('id', 'main')
            .single();
          
          if (!error && rows) {
            setData(rows.data);
            setLastSync(new Date());
            setSyncStatus("synced");
            setLoaded(true);
            return;
          }
        } catch (e) {
          console.log("Supabase load failed, falling back to localStorage");
        }
      }
      
      try {
        const saved = localStorage.getItem(STORE_KEY);
        if (saved) {
          setData(JSON.parse(saved));
        }
      } catch (e) {}
      setSyncStatus(isSupabaseConfigured() ? "error" : "local");
      setLoaded(true);
    };
    loadData();
  }, []);

  // ========== SAVE WHEN NEEDED ==========
  useEffect(() => {
    if (!loaded || !needsSave.current) return;
    
    // Clear any pending save
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    
    // Debounced save
    saveTimeout.current = setTimeout(() => {
      // Save to localStorage
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
      } catch (e) {}
      
      // Save to Supabase
      saveToSupabase(data);
      needsSave.current = false;
    }, 1000);
    
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [data, loaded, saveToSupabase]);

  // ========== DATA MUTATIONS (all set needsSave) ==========
  const updateData = useCallback((updater) => {
    needsSave.current = true;
    setData(updater);
  }, []);

  const addTask = useCallback((text, owner = "Dion") => {
    if (!text.trim()) return;
    updateData(d => ({ ...d, tasks: [...d.tasks, { id: Date.now().toString(), text, owner, created: new Date().toISOString() }] }));
  }, [updateData]);

  const toggleTask = useCallback((id) => {
    updateData(d => {
      const task = d.tasks.find(t => t.id === id);
      if (!task) return d;
      return { ...d, tasks: d.tasks.filter(t => t.id !== id), completed: [...d.completed, { ...task, completedAt: new Date().toISOString() }] };
    });
  }, [updateData]);

  const deleteTask = useCallback((id) => {
    updateData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  }, [updateData]);

  const uncompleteTask = useCallback((id) => {
    updateData(d => {
      const task = d.completed.find(t => t.id === id);
      if (!task) return d;
      return { ...d, completed: d.completed.filter(t => t.id !== id), tasks: [...d.tasks, { id: task.id, text: task.text, owner: task.owner, created: task.created }] };
    });
  }, [updateData]);

  const updateScore = useCallback((idx, val) => {
    updateData(d => ({ ...d, scores: { ...d.scores, [idx]: val } }));
  }, [updateData]);

  const setNorthStarValue = useCallback((val) => {
    updateData(d => ({ ...d, northStar: { ...d.northStar, [weekKey]: val } }));
  }, [weekKey, updateData]);

  const setExperimentsValue = useCallback((val) => {
    updateData(d => ({ ...d, experiments: { ...d.experiments, [weekKey]: val } }));
  }, [weekKey, updateData]);

  const toggleExpDone = useCallback((expId) => {
    updateData(d => ({ ...d, expDone: { ...d.expDone, [expId]: !d.expDone?.[expId] } }));
  }, [updateData]);

  const setTopPriorities = useCallback((val) => {
    updateData(d => ({ ...d, topPriorities: { ...d.topPriorities, [weekKey]: val } }));
  }, [weekKey, updateData]);

  const setBlockers = useCallback((val) => {
    updateData(d => ({ ...d, blockers: { ...d.blockers, [weekKey]: val } }));
  }, [weekKey, updateData]);

  // ========== TODAY'S EXPERIMENTS ==========
  const getTodayExperiments = () => {
    const phaseExps = experimentBank.filter(e => e.phase === phase);
    const idx = day % Math.max(1, Math.floor(phaseExps.length / 2));
    const todayExp = [
      phaseExps.find(e => e.owner === "Annie" && phaseExps.indexOf(e) >= idx * 2) || phaseExps.find(e => e.owner === "Annie"),
      phaseExps.find(e => e.owner === "Dion" && phaseExps.indexOf(e) >= idx * 2) || phaseExps.find(e => e.owner === "Dion"),
    ].filter(Boolean);
    return todayExp;
  };
  const todayExps = getTodayExperiments();

  // ========== UI COMPONENTS ==========
  const Section = ({ title, emoji, children }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: 0.3 }}>{title}</span>
      </div>
      {children}
    </div>
  );

  const ExpCard = ({ exp }) => {
    const done = data.expDone?.[exp.id];
    return (
      <div className="task-row" style={{
        background: done ? "var(--surface)" : "var(--card)",
        border: `1.5px solid ${done ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "18px 20px",
        marginBottom: 14,
        opacity: done ? 0.7 : 1,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <button onClick={() => toggleExpDone(exp.id)} style={{
            width: 24, height: 24, borderRadius: "50%", border: `2px solid ${done ? "var(--accent)" : "var(--border)"}`,
            background: done ? "var(--accent)" : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 2,
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
          }}>
            {done && <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>✓</span>}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 8.5, fontWeight: 800, color: "#fff", background: catColors[exp.cat] || "var(--accent)",
                padding: "2px 7px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.8
              }}>{exp.cat}</span>
              <span style={{
                fontSize: 8.5, fontWeight: 700, color: exp.owner === "Annie" ? "#ec4899" : "#3b82f6",
                padding: "2px 7px", borderRadius: 6, border: `1px solid ${exp.owner === "Annie" ? "#ec4899" : "#3b82f6"}`,
                textTransform: "uppercase", letterSpacing: 0.8
              }}>{exp.owner}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>{exp.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-sec)", lineHeight: 1.6, marginBottom: 8 }}>
              <strong style={{ color: "var(--text-muted)" }}>Hypothesis:</strong> {exp.hyp}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-sec)", lineHeight: 1.6, marginBottom: 8 }}>
              <strong style={{ color: "var(--text-muted)" }}>Action:</strong> {exp.action}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-sec)", lineHeight: 1.6, marginBottom: 6 }}>
              <strong style={{ color: "var(--text-muted)" }}>Measure:</strong> {exp.measure}
            </div>
            <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>{exp.credit}</div>
          </div>
        </div>
      </div>
    );
  };

  const TaskRow = ({ task, onToggle, onDelete, completed = false }) => (
    <div className="task-row" style={{
      display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
      background: "var(--card)", borderRadius: "var(--radius)", border: "1.5px solid var(--border)",
      marginBottom: 10, opacity: completed ? 0.6 : 1,
    }}>
      <button onClick={() => onToggle(task.id)} style={{
        width: 22, height: 22, borderRadius: "50%", border: `2px solid ${completed ? "var(--accent)" : "var(--border)"}`,
        background: completed ? "var(--accent)" : "transparent", cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
      }}>
        {completed && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
      </button>
      <span style={{
        flex: 1, fontSize: 13, color: completed ? "var(--text-muted)" : "var(--text)", fontWeight: 500,
        textDecoration: completed ? "line-through" : "none"
      }}>{task.text}</span>
      <span style={{
        fontSize: 9, fontWeight: 700, color: task.owner === "Annie" ? "#ec4899" : "#3b82f6",
        padding: "3px 8px", borderRadius: 6, border: `1px solid ${task.owner === "Annie" ? "#ec4899" : "#3b82f6"}`,
        textTransform: "uppercase", letterSpacing: 0.5
      }}>{task.owner}</span>
      {!completed && (
        <button onClick={() => onDelete(task.id)} style={{
          background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 4,
        }}>×</button>
      )}
    </div>
  );

  const SyncIndicator = () => {
    const colors = { synced: "#10b981", syncing: "#f59e0b", error: "#ef4444", local: "#6b7280", offline: "#6b7280" };
    const labels = { synced: "Synced", syncing: "Syncing...", error: "Sync error", local: "Local only", offline: "Offline" };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[syncStatus] }} />
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{labels[syncStatus]}</span>
      </div>
    );
  };

  // Filter experiments
  const filteredExps = experimentBank.filter(e => {
    if (view === "all") return e.phase === phase;
    if (view === "annie") return e.owner === "Annie" && e.phase === phase;
    if (view === "dion") return e.owner === "Dion" && e.phase === phase;
    return true;
  });

  // ========== RENDER ==========
  return (
    <div style={{
      "--bg": "#0a0a0c", "--surface": "#111114", "--card": "#18181c", "--border": "#2a2a30",
      "--text": "#f4f4f5", "--text-sec": "#a1a1aa", "--text-muted": "#71717a",
      "--accent": "#10b981", "--accent-soft": "rgba(16,185,129,0.15)", "--accent-glow": "rgba(16,185,129,0.3)",
      "--blue": "#3b82f6", "--purple": "#a855f7", "--pink": "#ec4899",
      "--radius": "14px", "--radius-sm": "10px",
      "--font": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: "var(--bg)", minHeight: "100vh", color: "var(--text)", fontFamily: "var(--font)",
    }}>
      <style>{`
        .task-row:hover { border-color: var(--accent) !important; }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>
            <span style={{ background: "linear-gradient(135deg, var(--accent), var(--blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Quietly</span>
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> Board</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 8 }}>
            Day {day} · Phase {phase} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </div>
          <SyncIndicator />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {["today", "tasks", "experiments", "dashboard"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: tab === t ? "var(--accent)" : "var(--surface)",
              color: tab === t ? "#fff" : "var(--text-sec)",
              fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.15s",
              textTransform: "capitalize"
            }}>{t}</button>
          ))}
        </div>

        {/* TODAY TAB */}
        {tab === "today" && (
          <div>
            <div style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))",
              border: "1.5px solid var(--accent)", borderRadius: "var(--radius)", padding: "20px 24px", marginBottom: 24
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>
                North Star
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.5 }}>{VISION_90}</div>
            </div>

            <Section title="Top 3 priorities today" emoji="🎯">
              <textarea
                value={data.topPriorities?.[weekKey] || ""}
                onChange={e => setTopPriorities(e.target.value)}
                placeholder="1. Most important thing...&#10;2. Second priority...&#10;3. Third priority..."
                style={{
                  width: "100%", background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)",
                  padding: 16, fontSize: 13, color: "var(--text)", fontFamily: "var(--font)", resize: "vertical", minHeight: 100, lineHeight: 1.6
                }}
              />
            </Section>

            <Section title="Today's experiments" emoji="🧪">
              {todayExps.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20, textAlign: "center" }}>
                  No experiments for today. Check the experiments tab!
                </div>
              ) : (
                todayExps.map(exp => <ExpCard key={exp.id} exp={exp} />)
              )}
            </Section>

            <Section title="Blockers / stuck on" emoji="🚧">
              <textarea
                value={data.blockers?.[weekKey] || ""}
                onChange={e => setBlockers(e.target.value)}
                placeholder="What's blocking progress? What decisions need to be made?"
                style={{
                  width: "100%", background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)",
                  padding: 16, fontSize: 13, color: "var(--text)", fontFamily: "var(--font)", resize: "vertical", minHeight: 80, lineHeight: 1.6
                }}
              />
            </Section>

            <Section title="Quick tasks" emoji="✅">
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Add a task..."
                  onKeyDown={e => {
                    if (e.key === "Enter" && e.target.value) {
                      addTask(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  style={{
                    flex: 1, background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)",
                    padding: "14px 18px", fontSize: 13, color: "var(--text)", fontFamily: "var(--font)"
                  }}
                />
              </div>
              {data.tasks.slice(0, 5).map(task => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
              ))}
            </Section>
          </div>
        )}

        {/* TASKS TAB */}
        {tab === "tasks" && (
          <div>
            <Section title="Add task" emoji="➕">
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  onKeyDown={e => {
                    if (e.key === "Enter" && e.target.value) {
                      addTask(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  style={{
                    flex: 1, background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)",
                    padding: "14px 18px", fontSize: 13, color: "var(--text)", fontFamily: "var(--font)"
                  }}
                />
              </div>
            </Section>

            <Section title="Active tasks" emoji="📋">
              {data.tasks.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20, textAlign: "center" }}>
                  No tasks yet. Add one above!
                </div>
              ) : (
                data.tasks.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                ))
              )}
            </Section>

            <Section title="Completed" emoji="✅">
              {data.completed.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20, textAlign: "center" }}>
                  Nothing completed yet. Get to work! 💪
                </div>
              ) : (
                data.completed.slice(0, 10).map(task => (
                  <TaskRow key={task.id} task={task} onToggle={uncompleteTask} onDelete={() => {}} completed />
                ))
              )}
            </Section>
          </div>
        )}

        {/* EXPERIMENTS TAB */}
        {tab === "experiments" && (
          <div>
            <div style={{
              background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)",
              padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", background: "var(--accent-soft)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "var(--accent)"
              }}>{phase}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                  Phase {phase}: {phase === 1 ? "Foundation" : phase === 2 ? "Execution" : "Leverage"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {phase === 1 ? "Days 0-13: Setup before execution" : phase === 2 ? "Days 14-44: Active outreach + iteration" : "Days 45-60: Case study, referrals, authority"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["all", "annie", "dion"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: view === v ? (v === "annie" ? "#ec4899" : v === "dion" ? "#3b82f6" : "var(--accent)") : "var(--surface)",
                  color: view === v ? "#fff" : "var(--text-sec)",
                  fontWeight: 600, fontSize: 11, cursor: "pointer", textTransform: "capitalize"
                }}>{v === "all" ? "All" : v}</button>
              ))}
            </div>

            {filteredExps.map(exp => <ExpCard key={exp.id} exp={exp} />)}
          </div>
        )}

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div>
            <div style={{ background:"var(--card)",borderRadius:"var(--radius-sm)",padding:"14px 18px",marginBottom:12,border:"1.5px solid var(--border)" }}>
              <div style={{ fontSize:8.5,fontWeight:700,color:"var(--purple)",textTransform:"uppercase",letterSpacing:1.8 }}>Year goal</div>
              <div style={{ fontSize:12,color:"var(--text-sec)",fontWeight:500,marginTop:3,lineHeight:1.5 }}>{YEAR_GOAL}</div>
            </div>

            <div style={{ background:"var(--card)",borderRadius:"var(--radius-sm)",padding:"14px 18px",marginBottom:20,border:"1.5px solid var(--border)",display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:4,height:32,borderRadius:4,background:"linear-gradient(180deg, var(--accent), var(--purple))",flexShrink:0 }} />
              <div>
                <div style={{ fontSize:8.5,fontWeight:700,color:"var(--accent)",textTransform:"uppercase",letterSpacing:1.8 }}>90-day target</div>
                <div style={{ fontSize:12,color:"var(--text-sec)",fontWeight:500,marginTop:3,lineHeight:1.5 }}>{VISION_90}</div>
              </div>
            </div>

            <Section title="Weekly pulse" emoji="📡">
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <div style={{ background:"var(--card)",borderRadius:"var(--radius)",padding:"16px 18px",border:"1.5px solid var(--border)",display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ fontSize:24 }}>{NORTH_STAR.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:9,fontWeight:800,color:"var(--blue)",textTransform:"uppercase",letterSpacing:1.2 }}>{NORTH_STAR.label}</div>
                    <div style={{ fontSize:10,color:"var(--text-muted)",marginTop:1 }}>{NORTH_STAR.description}</div>
                  </div>
                  <input type="number" value={data.northStar?.[weekKey]||""} onChange={e=>setNorthStarValue(e.target.value)} placeholder="0"
                    style={{ width:48,border:"2px solid var(--border)",borderRadius:10,padding:"6px",fontSize:20,fontWeight:800,textAlign:"center",color:"var(--accent)",fontFamily:"var(--font)",background:"var(--bg)" }}
                  />
                </div>
                <div style={{ background:"var(--card)",borderRadius:"var(--radius)",padding:"16px 18px",border:"1.5px solid var(--border)",display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ fontSize:24 }}>{EXPERIMENTS_META.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:9,fontWeight:800,color:"var(--purple)",textTransform:"uppercase",letterSpacing:1.2 }}>{EXPERIMENTS_META.label}</div>
                    <div style={{ fontSize:10,color:"var(--text-muted)",marginTop:1 }}>{EXPERIMENTS_META.description}</div>
                  </div>
                  <input type="number" value={data.experiments?.[weekKey]||""} onChange={e=>setExperimentsValue(e.target.value)} placeholder="0"
                    style={{ width:48,border:"2px solid var(--border)",borderRadius:10,padding:"6px",fontSize:20,fontWeight:800,textAlign:"center",color:"var(--purple)",fontFamily:"var(--font)",background:"var(--bg)" }}
                  />
                </div>
              </div>
            </Section>

            <Section title="Roadmap → $100K" emoji="🗺️">
              <div style={{ position:"relative",paddingLeft:20 }}>
                <div style={{ position:"absolute",left:5,top:4,bottom:4,width:2,background:"var(--border)",borderRadius:2 }} />
                {ROADMAP.map((r,i) => {
                  const isNow = r.status === "now";
                  return (
                    <div key={i} style={{ position:"relative",marginBottom:i<ROADMAP.length-1?16:0 }}>
                      <div style={{
                        position:"absolute",left:-19,top:3,width:10,height:10,borderRadius:"50%",
                        background:isNow?"var(--accent)":"var(--border)",
                        border:isNow?"2px solid var(--accent)":"2px solid var(--bg)",
                        boxShadow:isNow?"0 0 0 3px var(--accent-glow)":"none",
                      }} />
                      <div style={{ display:"flex",alignItems:"baseline",gap:8,marginBottom:3 }}>
                        <span style={{ fontSize:12,fontWeight:800,color:isNow?"var(--accent)":"var(--text)",minWidth:52 }}>{r.month}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:isNow?"var(--accent)":"var(--text-sec)" }}>{r.label}</span>
                        {isNow && <span style={{ fontSize:8,fontWeight:800,padding:"2px 7px",borderRadius:8,background:"var(--accent-soft)",color:"var(--accent)",letterSpacing:0.5 }}>NOW</span>}
                      </div>
                      <div style={{ fontSize:11,color:"var(--text-muted)",lineHeight:1.5,marginBottom:2 }}>{r.focus}</div>
                      <div style={{ fontSize:10,fontWeight:600,color:isNow?"var(--accent)":"var(--text-sec)",lineHeight:1.4 }}>→ {r.milestone}</div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Monthly scorecard" emoji="📊">
              <div style={{ fontSize:11,color:"var(--text-muted)",marginBottom:12,fontWeight:500 }}>Track actuals against targets. Update as you go.</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:10 }}>
                {metrics.map((m,i) => (
                  <div key={i} className="task-row" style={{
                    background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)",padding:"20px 16px",textAlign:"center",
                  }}>
                    <div style={{ fontSize:24,marginBottom:4 }}>{m.icon}</div>
                    <div style={{ fontSize:9,fontWeight:800,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:3 }}>{m.label}</div>
                    <div style={{ fontSize:24,fontWeight:800,color:"var(--text)",letterSpacing:-0.5 }}>{m.target}</div>
                    <div style={{ fontSize:10,color:"var(--accent)",marginTop:6,marginBottom:3,fontWeight:700 }}>Actual</div>
                    <input type="text" value={data.scores?.[i]||""} onChange={e=>updateScore(i,e.target.value)} placeholder="—"
                      style={{ width:70,border:"2px solid var(--border)",borderRadius:10,padding:"5px 8px",fontSize:16,fontWeight:800,textAlign:"center",color:"var(--accent)",fontFamily:"var(--font)",background:"var(--bg)" }}
                    />
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        <div style={{ textAlign:"center",padding:"32px 0 20px",fontSize:11,color:"var(--text-muted)",fontWeight:500 }}>
          {lastSync ? `Last synced ${lastSync.toLocaleTimeString()}` : ""}  ·  Annie & Dion  ·  quietly.systems  ·  💜
        </div>
      </div>
    </div>
  );
}
