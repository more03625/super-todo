// @ts-nocheck
import React, { useState, useEffect, useRef, useId } from "react";

/* ---------------- design tokens ---------------- */
const COLORS = {
  bg: "#F4F6F9",
  raised: "#FFFFFF",
  card: "#FFFFFF",
  hi: "#16181D",
  mid: "#5F6672",
  low: "#9AA1AC",
  border: "#D8DCE3",
  borderStrong: "#B8BFC9",
  coral: "#E11D48",
  mint: "#059669",
  accent: "#2563EB",
  accentLight: "#EFF6FF",
};

/* ---------------- global styles ---------------- */
const GLOBAL_CSS = `
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  button { -webkit-tap-highlight-color: transparent; -webkit-appearance: none; appearance: none; background: none; border: none; font: inherit; }
  button:focus { outline: none; }

  .app-shell {
    max-width: 440px;
    margin: 0 auto;
    padding: 24px 16px 130px;
    min-height: 100dvh;
  }

  /* Mobile: flex column with gap so cards always have breathing room */
  .split {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .card {
    background: ${COLORS.card};
    border-radius: 24px;
    padding: 20px;
    border: 1px solid ${COLORS.border};
    box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
  }
  .card-outline {
    background: ${COLORS.card};
    border-radius: 24px;
    padding: 16px;
    border: 1px solid ${COLORS.border};
    box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
  }
  .day-pill {
    padding: 6px 2px 8px;
    border-radius: 18px;
    border: 1px solid transparent;
    background: transparent;
    transition: background 0.2s, border-color 0.2s;
    min-width: 0;
    overflow: hidden;
  }
  .day-pill.selected {
    background: ${COLORS.accentLight};
    border-color: ${COLORS.accent};
  }

  /* 7-column day pill grid — cells shrink to fill available width */
  .week-day-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    min-width: 0;
  }
  .week-day-grid > button {
    min-width: 0;
    overflow: hidden;
  }

  /* Page transition: enter → visible */
  .view-enter {
    opacity: 0;
    transform: translateY(16px);
  }
  .view-visible {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.28s ease, transform 0.32s cubic-bezier(.22,1,.36,1);
  }

  @media (min-width: 860px) {
    .app-shell { max-width: 1200px; padding: 48px 56px 100px; }
    .split {
      display: grid;
      grid-template-columns: minmax(420px, 480px) 1fr;
      gap: 32px;
      align-items: start;
    }
    .split > .card, .split > .card-outline { height: fit-content; }
  }
  @media (min-width: 1400px) {
    .app-shell { max-width: 1440px; padding: 56px 72px 100px; }
    .split { grid-template-columns: minmax(460px, 560px) 1fr; gap: 40px; }
  }
`;

/* ---------------- date helpers ---------------- */
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}
function startOfWeekMon(d) {
  const nd = new Date(d);
  const day = nd.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(nd, diff);
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function weekDays(anchor) {
  const start = startOfWeekMon(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
function monthGrid(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = startOfWeekMon(first);
  const end = addDays(startOfWeekMon(last), 6);
  const days = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}
function fmtWeekday(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
}
function fmtShort(d) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}
function fmtMonthYear(d) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/* ---------------- animated number hook ---------------- */
function useAnimatedNumber(target, duration = 650) {
  const [value, setValue] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const start = ref.current;
    const t0 = performance.now();
    let raf;
    function tick(now) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = start + (target - start) * eased;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

function colorAt(pct) {
  if (pct >= 100) return { from: "#059669", to: "#34D399" };
  if (pct < 50) return { from: "#F97316", to: "#E11D48" };
  return { from: "#E11D48", to: "#6366F1" };
}

/* ---------------- responsive window width hook ---------------- */
function useWindowWidth() {
  const [w, setW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 390
  );
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

/* ---------------- icons ---------------- */
const CheckIcon = () => (
  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
    <path d="M1 5L4.5 8.5L11 1.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19M5 12H19" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M15 18L9 12L15 6" stroke={COLORS.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="3" stroke={COLORS.accent} strokeWidth="1.8" />
    <path d="M3 9.5H21" stroke={COLORS.accent} strokeWidth="1.8" />
    <path d="M8 3V6.5M16 3V6.5" stroke={COLORS.accent} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M9 6L15 12L9 18" stroke={COLORS.mid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------------- Ring ---------------- */
function Ring({ pct, size = 220, stroke = 26, showHead = true, label, sublabel, onClick }) {
  const animated = useAnimatedNumber(pct);
  const clamped = Math.max(0, Math.min(100, animated));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (clamped / 100) * circumference;
  const angle = (clamped / 100) * 360 - 90;
  const { from, to } = colorAt(clamped);
  const gid = "g" + useId().replace(/:/g, "");

  const prevComplete = useRef(false);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (pct >= 100 && !prevComplete.current) {
      setPulse(true);
      prevComplete.current = true;
      const t = setTimeout(() => setPulse(false), 550);
      return () => clearTimeout(t);
    }
    if (pct < 100) prevComplete.current = false;
  }, [pct]);

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      aria-label={`progress ${Math.round(clamped)}%`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        padding: 0,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        transform: pulse ? "scale(1.07)" : "scale(1)",
        transition: "transform 0.35s cubic-bezier(.22,1.4,.36,1)",
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={COLORS.border} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashoffset }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {showHead && clamped > 0 && (
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}>
            <circle cx={size / 2 + radius} cy={size / 2} r={stroke / 2.05} fill={to} />
          </g>
        )}
      </svg>
      {(label || sublabel) && (
        <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {label && (
            <span style={{ fontSize: size > 150 ? 30 : 12, fontWeight: 700, color: COLORS.hi, fontVariantNumeric: "tabular-nums" }}>
              {Math.round(clamped)}%
            </span>
          )}
          {sublabel && (
            <span style={{ fontSize: 10, color: COLORS.mid, marginTop: 4, letterSpacing: 0.6, textTransform: "uppercase" }}>
              {sublabel}
            </span>
          )}
        </div>
      )}
    </Tag>
  );
}

/* ---------------- TaskItem (swipe to delete) ---------------- */
function TaskItem({ task, onToggle, onDelete }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(null);

  function onDown(e) {
    startX.current = e.clientX ?? e.touches?.[0]?.clientX;
    setDragging(true);
  }
  function onMove(e) {
    if (!dragging || startX.current == null) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const diff = x - startX.current;
    setDx(Math.min(0, Math.max(-100, diff)));
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    if (dx < -60) onDelete();
    else setDx(0);
  }

  return (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 20,
          borderRadius: 16,
          background: COLORS.coral,
          opacity: Math.min(1, -dx / 85),
        }}
      >
        <span style={{ color: "white", fontSize: 14, fontWeight: 500 }}>Delete</span>
      </div>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 16,
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          padding: "14px 16px",
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(.22,1,.36,1)",
          touchAction: "pan-y",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <button
          onClick={onToggle}
          aria-label={task.done ? "Mark incomplete" : "Mark complete"}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: `1.5px solid ${task.done ? COLORS.mint : COLORS.borderStrong}`,
            background: task.done ? COLORS.mint : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.2s",
            cursor: "pointer",
          }}
        >
          {task.done && <CheckIcon />}
        </button>
        <span
          style={{
            flex: 1,
            fontSize: 15,
            color: task.done ? COLORS.low : COLORS.hi,
            textDecoration: task.done ? "line-through" : "none",
            transition: "color 0.2s",
            textAlign: "left",
          }}
        >
          {task.title}
        </span>
      </div>
    </div>
  );
}

/* ---------------- AddTask ---------------- */
function AddTask({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    if (value.trim()) onAdd(value.trim());
    setValue("");
    setOpen(false);
  }

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.35)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: open ? 96 : -120,
          transform: "translateX(-50%)",
          width: "min(400px, 90vw)",
          background: COLORS.raised,
          borderRadius: 20,
          padding: 8,
          border: `1px solid ${COLORS.border}`,
          zIndex: 50,
          opacity: open ? 1 : 0,
          transition: "bottom 0.35s cubic-bezier(.22,1,.36,1), opacity 0.25s",
          boxShadow: "0 12px 40px rgba(16, 24, 40, 0.12)",
        }}
      >
        <input
          autoFocus={open}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="What do you want to get done?"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: COLORS.hi,
            fontSize: 15,
            padding: "12px 16px",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 8px 4px" }}>
          <button
            onClick={() => setOpen(false)}
            style={{ padding: "6px 12px", fontSize: 14, color: COLORS.mid, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            style={{
              padding: "6px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              background: COLORS.accent,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add task"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: COLORS.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${COLORS.accent}`,
          boxShadow: "0 8px 24px rgba(37, 99, 235, 0.28)",
          zIndex: 30,
          cursor: "pointer",
        }}
      >
        <PlusIcon />
      </button>
    </>
  );
}

/* ---------------- progress helper ---------------- */
function progressFor(tasks) {
  if (!tasks || tasks.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
}

/* ---------------- Task list card ---------------- */
function TaskListCard({ title, tasks, dateKeyStr, toggleTask, deleteTask }) {
  return (
    <div className="card-outline">
      <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.mid, margin: "0 0 14px" }}>
        {title}
      </h2>
      {(!tasks || tasks.length === 0) && (
        <div style={{ borderRadius: 16, border: `1px dashed ${COLORS.borderStrong}`, padding: "28px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: COLORS.mid, margin: 0 }}>Nothing here yet.</p>
        </div>
      )}
      {tasks?.map((t) => (
        <TaskItem key={t.id} task={t} onToggle={() => toggleTask(dateKeyStr, t.id)} onDelete={() => deleteTask(dateKeyStr, t.id)} />
      ))}
    </div>
  );
}

/* ---------------- Animated view wrapper ---------------- */
function AnimatedView({ children }) {
  const [phase, setPhase] = useState("enter");
  useEffect(() => {
    // Double-rAF so the browser has painted the enter state before transitioning
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("visible"));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return <div className={`view-${phase}`}>{children}</div>;
}

/* ---------------- Day View ---------------- */
function DayView({ date, tasksByDate, addTask, toggleTask, deleteTask, onOpenWeek }) {
  const key = dateKey(date);
  const tasks = tasksByDate[key];
  const { done, total, pct } = progressFor(tasks);
  const windowWidth = useWindowWidth();
  const ringSize = windowWidth < 400 ? 140 : 168;
  const ringStroke = windowWidth < 400 ? 18 : 22;

  return (
    <AnimatedView>
      <div className="app-shell">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.mid, margin: 0 }}>
              {fmtWeekday(date)}
            </p>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: COLORS.hi, margin: "2px 0 0" }}>Today</h1>
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.hi,
              flexShrink: 0,
            }}
          >
            RM
          </div>
        </div>

        <div className="split">
          <div
            className="card"
            onClick={onOpenWeek}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.mid }}>
                Activity Ring
              </span>
              <ChevronRightIcon />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <Ring pct={pct} size={ringSize} stroke={ringStroke} />
              <div>
                <p style={{ fontSize: 13, color: COLORS.mid, margin: "0 0 4px", fontWeight: 500 }}>Tasks</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: COLORS.hi, margin: 0 }}>
                  {done}
                  <span style={{ color: COLORS.mid, fontWeight: 500 }}>/{total || 0}</span>
                </p>
                <p style={{ fontSize: 12, color: COLORS.accent, margin: "6px 0 0" }}>Tap to see your week</p>
              </div>
            </div>
          </div>

          <TaskListCard title="Tasks" tasks={tasks} dateKeyStr={key} toggleTask={toggleTask} deleteTask={deleteTask} />
        </div>

        <AddTask onAdd={(title) => addTask(key, title)} />
      </div>
    </AnimatedView>
  );
}

/* ---------------- Week View ---------------- */
function WeekView({ anchor, setAnchor, selected, setSelected, tasksByDate, toggleTask, deleteTask, onBack, onOpenMonth }) {
  const days = weekDays(anchor);
  const today = new Date();
  const selKey = dateKey(selected);
  const selTasks = tasksByDate[selKey];
  const { done, total, pct } = progressFor(selTasks);
  const windowWidth = useWindowWidth();

  // Scale ring sizes to the available width on mobile
  const miniRingSize = windowWidth < 360 ? 34 : windowWidth < 400 ? 38 : 44;
  const miniStroke = windowWidth < 400 ? 6 : 7;
  const mainRingSize = windowWidth < 400 ? 160 : windowWidth < 480 ? 180 : 200;
  const mainStroke = windowWidth < 400 ? 20 : 24;

  function goWeek(delta) {
    const next = addDays(anchor, delta * 7);
    setAnchor(next);
    setSelected(weekDays(next)[0]);
  }

  return (
    <AnimatedView>
      <div className="app-shell">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: COLORS.accent, cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <BackIcon /> Today
          </button>
          <h1 style={{ fontSize: windowWidth < 380 ? 13 : 15, fontWeight: 700, color: COLORS.hi, margin: "0 8px", textAlign: "center" }}>
            {fmtShort(days[0])} – {fmtShort(days[6])}
          </h1>
          <button
            onClick={onOpenMonth}
            aria-label="Open month calendar"
            style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.card, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <CalendarIcon />
          </button>
        </div>

        <div className="split">
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <button onClick={() => goWeek(-1)} style={{ color: COLORS.mid, fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>
                ‹
              </button>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.mid }}>
                This week
              </span>
              <button onClick={() => goWeek(1)} style={{ color: COLORS.mid, fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>
                ›
              </button>
            </div>

            <div className="week-day-grid">
              {days.map((d, i) => {
                const k = dateKey(d);
                const { pct: dayPct } = progressFor(tasksByDate[k]);
                const isSelected = sameDay(d, selected);
                const isToday = sameDay(d, today);
                return (
                  <button
                    key={k}
                    onClick={() => setSelected(d)}
                    className={`day-pill${isSelected ? " selected" : ""}`}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? COLORS.accent : COLORS.mid,
                      }}
                    >
                      {DAY_LETTERS[i]}
                    </span>
                    {/* Wrap ring in a sized container so it scales with the column */}
                    <div style={{ width: miniRingSize, height: miniRingSize, flexShrink: 0 }}>
                      <Ring pct={dayPct} size={miniRingSize} stroke={miniStroke} showHead={false} />
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Ring pct={pct} size={mainRingSize} stroke={mainStroke} label sublabel={total ? `${done}/${total} DONE` : "NO TASKS"} />
              <p style={{ marginTop: 16, fontSize: 14, color: COLORS.mid }}>{fmtWeekday(selected)}</p>
            </div>
          </div>

          <TaskListCard title="Tasks that day" tasks={selTasks} dateKeyStr={selKey} toggleTask={toggleTask} deleteTask={deleteTask} />
        </div>
      </div>
    </AnimatedView>
  );
}

/* ---------------- Month Sheet ---------------- */
function MonthSheet({ initial, tasksByDate, onClose, onSelectDate }) {
  const [anchor, setAnchor] = useState(initial);
  const [visible, setVisible] = useState(false);
  const today = new Date();
  const days = monthGrid(anchor);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return (
    <>
      <div
        onClick={close}
        style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", zIndex: 40, opacity: visible ? 1 : 0, transition: "opacity 0.25s" }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          margin: "0 auto",
          maxWidth: 460,
          maxHeight: "85dvh",
          overflowY: "auto",
          background: COLORS.raised,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTop: `1px solid ${COLORS.border}`,
          borderLeft: `1px solid ${COLORS.border}`,
          borderRight: `1px solid ${COLORS.border}`,
          padding: "16px 20px 40px",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 4, background: COLORS.borderStrong, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
            style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.hi, fontSize: 18, cursor: "pointer" }}
          >
            ‹
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: COLORS.hi, margin: 0 }}>{fmtMonthYear(anchor)}</h2>
          <button
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
            style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.hi, fontSize: 18, cursor: "pointer" }}
          >
            ›
          </button>
        </div>

        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 16, textAlign: "center" }}>
          {DAY_LETTERS.map((l, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 500, color: COLORS.mid }}>
              {l}
            </span>
          ))}
          {days.map((d) => {
            const k = dateKey(d);
            const { pct } = progressFor(tasksByDate[k]);
            const inMonth = sameMonth(d, anchor);
            const isToday = sameDay(d, today);
            return (
              <button
                key={k}
                onClick={() => {
                  onSelectDate(d);
                  close();
                }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", opacity: inMonth ? 1 : 0.3 }}
              >
                <Ring pct={pct} size={36} stroke={6} showHead={false} />
                <span style={{ fontSize: 11, color: isToday ? COLORS.accent : COLORS.mid, fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ---------------- seed data ---------------- */
function seedData() {
  const today = new Date();
  const y = addDays(today, -1);
  const y2 = addDays(today, -2);
  return {
    [dateKey(today)]: [
      { id: "a", title: "Review Google SSE resume gaps", done: true },
      { id: "b", title: "Ship fuel receipt app print fix", done: true },
      { id: "c", title: "Reply to Instagram DMs", done: false },
      { id: "d", title: "Gym — leg day", done: false },
    ],
    [dateKey(y)]: [
      { id: "e", title: "Record vlog b-roll", done: true },
      { id: "f", title: "Plan 30-day content calendar", done: true },
    ],
    [dateKey(y2)]: [
      { id: "g", title: "Firestore sync spike", done: true },
      { id: "h", title: "PAN card update follow-up", done: false },
      { id: "i", title: "Cricket practice", done: true },
    ],
  };
}

/* ---------------- App ---------------- */
export default function App() {
  const today = new Date();
  const [view, setView] = useState("day");
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [monthOpen, setMonthOpen] = useState(false);
  const [tasksByDate, setTasksByDate] = useState(seedData);

  function addTask(key, title) {
    setTasksByDate((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), { id: `${Date.now()}-${Math.random()}`, title, done: false }],
    }));
  }
  function toggleTask(key, id) {
    setTasksByDate((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }
  function deleteTask(key, id) {
    setTasksByDate((prev) => ({ ...prev, [key]: (prev[key] || []).filter((t) => t.id !== id) }));
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.hi, minHeight: "100dvh", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      {view === "day" ? (
        <DayView
          key="day"
          date={today}
          tasksByDate={tasksByDate}
          addTask={addTask}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
          onOpenWeek={() => {
            setAnchor(today);
            setSelected(today);
            setView("week");
          }}
        />
      ) : (
        <WeekView
          key="week"
          anchor={anchor}
          setAnchor={setAnchor}
          selected={selected}
          setSelected={setSelected}
          tasksByDate={tasksByDate}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
          onBack={() => setView("day")}
          onOpenMonth={() => setMonthOpen(true)}
        />
      )}

      {monthOpen && (
        <MonthSheet
          initial={anchor}
          tasksByDate={tasksByDate}
          onClose={() => setMonthOpen(false)}
          onSelectDate={(d) => {
            setAnchor(d);
            setSelected(d);
            setView("week");
          }}
        />
      )}
    </div>
  );
}
