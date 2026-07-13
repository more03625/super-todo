// @ts-nocheck
import React, { useState, useEffect, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRitualTasks } from "@/hooks/useRitualTasks";

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
    width: 100%;
    max-width: 440px;
    margin: 0 auto;
    padding: 24px 16px 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .page-header {
    flex-shrink: 0;
  }

  /* Mobile: flex column with gap so cards always have breathing room */
  .split {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .split > .card {
    flex-shrink: 0;
  }

  /* Tasks panel: header + scrollable list only */
  .task-list-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    padding: 0;
    flex: 1;
  }
  .task-list-card .task-list-header {
    flex-shrink: 0;
    padding: 16px 16px 12px;
    margin: 0;
  }
  .task-list-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 0 16px 8px;
  }

  /* Page-level docked composer */
  .bottom-composer {
    flex-shrink: 0;
    padding: 12px 0 max(24px, env(safe-area-inset-bottom, 0px));
  }
  .bottom-composer-field {
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 18px;
    background: ${COLORS.card};
    border: 1px solid ${COLORS.border};
    padding: 14px 18px;
    box-shadow: 0 4px 16px rgba(16, 24, 40, 0.08), 0 1px 3px rgba(16, 24, 40, 0.06);
  }
  .composer-input::placeholder {
    color: ${COLORS.low};
  }

  .view-root {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    min-width: 0;
    overflow: hidden;
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

  .task-enter {
    animation: taskFadeIn 220ms cubic-bezier(.22,1,.36,1) forwards;
  }
  @keyframes taskFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ritualSpin { to { transform: rotate(360deg); } }

  /* Immediate pressed feedback on tappable cards */
  .tap-target { transition: transform 0.15s ease; }
  .tap-target:active { transform: scale(0.98); }

  .composer-input::placeholder {
    color: ${COLORS.low};
  }

  @media (min-width: 860px) {
    .app-shell { max-width: 1200px; padding: 48px 56px 0; }
    .split {
      display: grid;
      grid-template-columns: minmax(420px, 480px) 1fr;
      grid-template-rows: minmax(0, 1fr);
      gap: 32px;
      align-items: stretch;
    }
    .split > .card { align-self: start; }
    /* Tasks card fills the full column height so ~6-8 tasks are visible before scrolling */
    .task-list-card { height: 100%; min-height: 0; }
  }
  @media (min-width: 1400px) {
    .app-shell { max-width: 1440px; padding: 56px 72px 0; }
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
function fmtWeekRange(start, end) {
  if (start.getFullYear() === end.getFullYear()) {
    return `${fmtShort(start)} – ${fmtShort(end)} ${end.getFullYear()}`;
  }
  return `${fmtShort(start)} ${start.getFullYear()} – ${fmtShort(end)} ${end.getFullYear()}`;
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
const PlusSmallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19M5 12H19" stroke={COLORS.low} strokeWidth="2" strokeLinecap="round" />
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
const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="6" r="1.6" fill={COLORS.low} />
    <circle cx="15" cy="6" r="1.6" fill={COLORS.low} />
    <circle cx="9" cy="12" r="1.6" fill={COLORS.low} />
    <circle cx="15" cy="12" r="1.6" fill={COLORS.low} />
    <circle cx="9" cy="18" r="1.6" fill={COLORS.low} />
    <circle cx="15" cy="18" r="1.6" fill={COLORS.low} />
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
function TaskItem({ task, onToggle, onDelete, onOpen, isNew = false, rowRef, rowStyle, dragHandle }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(null);
  const movedRef = useRef(false);

  function onDown(e) {
    if (task.virtual) return; // projected occurrences can't be swipe-deleted
    startX.current = e.clientX ?? e.touches?.[0]?.clientX;
    movedRef.current = false;
    setDragging(true);
  }
  function onMove(e) {
    if (!dragging || startX.current == null) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const diff = x - startX.current;
    if (Math.abs(diff) > 5) movedRef.current = true;
    setDx(Math.min(0, Math.max(-100, diff)));
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    if (dx < -60) onDelete();
    else setDx(0);
  }

  function openDetail() {
    // A swipe that ends over the title must not navigate; neither should
    // tasks still saving (temp ids have no server route yet). Projected
    // occurrences open their source task's detail page.
    if (movedRef.current || task.pending || !onOpen) return;
    onOpen(task.sourceId || task.id);
  }

  return (
    <div ref={rowRef} className={isNew ? "task-enter" : undefined} style={{ position: "relative", marginBottom: 8, ...rowStyle }}>
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
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(.22,1,.36,1), opacity 0.2s",
          touchAction: "pan-y",
          cursor: "grab",
          userSelect: "none",
          opacity: task.pending ? 0.6 : 1,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!task.virtual) onToggle();
          }}
          aria-label={task.virtual ? "Upcoming occurrence" : task.done ? "Mark incomplete" : "Mark complete"}
          aria-disabled={task.virtual || undefined}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: `1.5px ${task.virtual ? "dashed" : "solid"} ${task.done ? COLORS.mint : COLORS.borderStrong}`,
            background: task.done ? COLORS.mint : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.2s",
            cursor: task.virtual ? "default" : "pointer",
          }}
        >
          {task.done && <CheckIcon />}
        </button>
        <span
          onClick={openDetail}
          style={{
            flex: 1,
            fontSize: 15,
            color: task.done ? COLORS.low : task.virtual ? COLORS.mid : COLORS.hi,
            textDecoration: task.done ? "line-through" : "none",
            transition: "color 0.2s",
            textAlign: "left",
            cursor: onOpen && !task.pending ? "pointer" : "inherit",
          }}
        >
          {task.title}
        </span>
        {task.virtual && (
          <span aria-label="Repeats" title="Upcoming occurrence" style={{ fontSize: 13, color: COLORS.low, flexShrink: 0 }}>
            ↻
          </span>
        )}
        {dragHandle && (
          <button
            aria-label="Reorder task"
            onPointerDown={(e) => {
              // Keep the vertical drag gesture out of the card's swipe handler.
              e.stopPropagation();
              dragHandle.onPointerDown(e);
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              dragHandle.onPointerMove(e);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              dragHandle.onPointerUp(e);
            }}
            onPointerCancel={(e) => {
              e.stopPropagation();
              dragHandle.onPointerCancel(e);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              marginRight: -6,
              borderRadius: 8,
              flexShrink: 0,
              cursor: "grab",
              touchAction: "none",
            }}
          >
            <GripIcon />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- BottomTaskComposer ---------------- */
function BottomTaskComposer({ value, onChange, onSubmit, placeholder = "Add a new task...", autoFocus = false }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleSubmit() {
    onSubmit();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="bottom-composer">
      <div className="bottom-composer-field" onClick={() => inputRef.current?.focus()}>
        <div
          aria-hidden
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: `1.5px solid ${COLORS.borderStrong}`,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: 0.7,
          }}
        >
          <PlusSmallIcon />
        </div>
        <input
          ref={inputRef}
          className="composer-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: COLORS.hi,
            fontSize: 15,
            padding: 0,
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

/* ---------------- progress helper ---------------- */
function progressFor(tasks) {
  // Projected future occurrences are display-only and can't be completed,
  // so they don't count toward the day's ring.
  const real = tasks?.filter((t) => !t.virtual) ?? [];
  if (real.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = real.filter((t) => t.done).length;
  return { done, total: real.length, pct: Math.round((done / real.length) * 100) };
}

/* ---------------- Task list card ---------------- */
function TaskListCard({ title, tasks, dateKeyStr, toggleTask, deleteTask, reorderTasks, lastAddedId }) {
  const router = useRouter();
  const listRef = useRef(null);
  const rowRefs = useRef(new Map());
  // { id, startIndex, hoverIndex, dy, height } while a handle-drag is active
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  dragRef.current = drag;
  const dragMeta = useRef(null);

  useEffect(() => {
    if (!listRef.current || dragRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [lastAddedId, tasks?.length]);

  function measuredHeights() {
    return tasks.map((t) => {
      const el = rowRefs.current.get(t.id);
      return el ? el.offsetHeight + 8 : 60;
    });
  }

  // Walk row heights (rows can wrap to two lines) instead of assuming a
  // uniform row height; crossing half of a neighbour swaps with it.
  function hoverIndexFor(startIndex, dy, heights) {
    let idx = startIndex;
    let remaining = dy;
    if (dy < 0) {
      while (idx > 0 && -remaining > heights[idx - 1] / 2) {
        remaining += heights[idx - 1];
        idx -= 1;
      }
    } else {
      while (idx < heights.length - 1 && remaining > heights[idx + 1] / 2) {
        remaining -= heights[idx + 1];
        idx += 1;
      }
    }
    return idx;
  }

  function onHandleDown(e, id, index) {
    if (!reorderTasks || !tasks || tasks.length < 2) return;
    e.preventDefault();
    const heights = measuredHeights();
    dragMeta.current = { id, startY: e.clientY, heights, startIndex: index };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ id, startIndex: index, hoverIndex: index, dy: 0, height: heights[index] });
  }

  function onHandleMove(e) {
    const meta = dragMeta.current;
    if (!meta) return;
    const dy = e.clientY - meta.startY;
    const hoverIndex = hoverIndexFor(meta.startIndex, dy, meta.heights);
    setDrag((d) => (d ? { ...d, dy, hoverIndex } : d));
  }

  function onHandleUp() {
    const meta = dragMeta.current;
    const d = dragRef.current;
    dragMeta.current = null;
    setDrag(null);
    if (!meta || !d || !tasks || d.hoverIndex === meta.startIndex) return;
    const ids = tasks.map((t) => t.id);
    ids.splice(meta.startIndex, 1);
    ids.splice(d.hoverIndex, 0, meta.id);
    reorderTasks(ids);
  }

  function rowStyleFor(id, index) {
    if (!drag) return undefined;
    if (id === drag.id) {
      return {
        transform: `translateY(${drag.dy}px)`,
        zIndex: 10,
        transition: "none",
        boxShadow: "0 8px 24px rgba(22,24,29,0.16)",
        borderRadius: 16,
      };
    }
    let shift = 0;
    if (drag.startIndex < drag.hoverIndex && index > drag.startIndex && index <= drag.hoverIndex) {
      shift = -drag.height;
    } else if (drag.startIndex > drag.hoverIndex && index >= drag.hoverIndex && index < drag.startIndex) {
      shift = drag.height;
    }
    return { transform: `translateY(${shift}px)`, transition: "transform 0.18s ease" };
  }

  return (
    <div className="card-outline task-list-card">
      <h2 className="task-list-header" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.mid }}>
        {title}
      </h2>
      <div className="task-list-scroll" ref={listRef}>
        {tasks?.map((t, i) => (
          <TaskItem
            key={t.id}
            task={t}
            isNew={t.id === lastAddedId}
            onToggle={() => toggleTask(dateKeyStr, t.id)}
            onDelete={() => deleteTask(dateKeyStr, t.id)}
            onOpen={(id) => router.push(`/tasks/${id}`)}
            rowRef={(el) => {
              if (el) rowRefs.current.set(t.id, el);
              else rowRefs.current.delete(t.id);
            }}
            rowStyle={rowStyleFor(t.id, i)}
            dragHandle={
              !t.virtual &&
              reorderTasks && {
                onPointerDown: (e) => onHandleDown(e, t.id, i),
                onPointerMove: onHandleMove,
                onPointerUp: onHandleUp,
                onPointerCancel: onHandleUp,
              }
            }
          />
        ))}
      </div>
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
  return <div className={`view-${phase} view-root`}>{children}</div>;
}

/* ---------------- Day View ---------------- */
function DayView({ date, tasksByDate, addTask, toggleTask, deleteTask, reorderTasks, onOpenWeek, userInitials = "?" }) {
  const key = dateKey(date);
  const tasks = tasksByDate[key];
  const { done, total, pct } = progressFor(tasks);
  const windowWidth = useWindowWidth();
  const ringSize = windowWidth < 400 ? 140 : 168;
  const ringStroke = windowWidth < 400 ? 18 : 22;
  const [draft, setDraft] = useState("");
  const [lastAddedId, setLastAddedId] = useState(null);

  function submitDraft() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const id = addTask(key, trimmed);
    setDraft("");
    setLastAddedId(id);
    setTimeout(() => setLastAddedId(null), 220);
  }

  return (
    <AnimatedView>
      <div className="app-shell">
        <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
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
            {userInitials}
          </div>
        </div>

        <div className="split">
          <div
            className="card tap-target"
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

          <TaskListCard
            title="Tasks"
            tasks={tasks}
            dateKeyStr={key}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            reorderTasks={reorderTasks}
            lastAddedId={lastAddedId}
          />
        </div>

        <BottomTaskComposer
          value={draft}
          onChange={setDraft}
          onSubmit={submitDraft}
          placeholder="Add a new task..."
        />
      </div>
    </AnimatedView>
  );
}

/* ---------------- Week View ---------------- */
function WeekView({ anchor, setAnchor, selected, setSelected, tasksByDate, toggleTask, deleteTask, addTask, reorderTasks, isWeekLoading, onBack, onOpenMonth }) {
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
  const [draft, setDraft] = useState("");
  const [lastAddedId, setLastAddedId] = useState(null);

  useEffect(() => {
    setDraft("");
    setLastAddedId(null);
  }, [selKey]);

  function submitDraft() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const id = addTask(selKey, trimmed);
    setDraft("");
    setLastAddedId(id);
    setTimeout(() => setLastAddedId(null), 220);
  }

  function goWeek(delta) {
    const next = addDays(anchor, delta * 7);
    setAnchor(next);
    setSelected(weekDays(next)[0]);
  }

  return (
    <AnimatedView>
      <div className="app-shell">
        <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: COLORS.accent, cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <BackIcon /> Today
          </button>
          <h1 style={{ fontSize: windowWidth < 380 ? 13 : 15, fontWeight: 700, color: COLORS.hi, margin: "0 8px", textAlign: "center" }}>
            {fmtWeekRange(days[0], days[6])}
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.mid }}>
                This week
                {isWeekLoading && (
                  <span
                    aria-label="Refreshing week"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      border: `2px solid ${COLORS.border}`,
                      borderTopColor: COLORS.accent,
                      animation: "ritualSpin 0.7s linear infinite",
                      flexShrink: 0,
                    }}
                  />
                )}
              </span>
              <button onClick={() => goWeek(1)} style={{ color: COLORS.mid, fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>
                ›
              </button>
            </div>

            {/* Content stays mounted during background refreshes — only the
                small header spinner indicates fetching. */}
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
                        className="day-pill"
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            fontSize: 10,
                            fontWeight: isSelected ? 700 : isToday ? 700 : 500,
                            background: isSelected ? COLORS.accent : "transparent",
                            color: isSelected ? "#FFFFFF" : isToday ? COLORS.accent : COLORS.mid,
                            transition: "background 0.2s ease, color 0.2s ease",
                          }}
                        >
                          {DAY_LETTERS[i]}
                        </span>
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

          <TaskListCard
            title="Tasks that day"
            tasks={selTasks}
            dateKeyStr={selKey}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            reorderTasks={reorderTasks}
            lastAddedId={lastAddedId}
          />
        </div>

        <BottomTaskComposer
          value={draft}
          onChange={setDraft}
          onSubmit={submitDraft}
          placeholder="Add a new task..."
        />
      </div>
    </AnimatedView>
  );
}

/* ---------------- Month Sheet ---------------- */
function MonthSheet({ monthAnchor, onMonthAnchorChange, tasksByDate, isLoading, onClose, onSelectDate }) {
  const [visible, setVisible] = useState(false);
  const today = new Date();
  const days = monthGrid(monthAnchor);

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
            onClick={() => onMonthAnchorChange(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}
            style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.hi, fontSize: 18, cursor: "pointer" }}
          >
            ‹
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: COLORS.hi, margin: 0 }}>{fmtMonthYear(monthAnchor)}</h2>
          <button
            onClick={() => onMonthAnchorChange(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}
            style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.hi, fontSize: 18, cursor: "pointer" }}
          >
            ›
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, marginTop: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `2px solid ${COLORS.border}`,
                borderTopColor: COLORS.accent,
                animation: "ritualSpin 0.7s linear infinite",
              }}
            />
          </div>
        ) : (
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 16, textAlign: "center" }}>
            {DAY_LETTERS.map((l, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 500, color: COLORS.mid }}>
                {l}
              </span>
            ))}
            {days.map((d) => {
              const k = dateKey(d);
              const { pct } = progressFor(tasksByDate[k]);
              const inMonth = sameMonth(d, monthAnchor);
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
        )}
      </div>
    </>
  );
}

/* ---------------- App ---------------- */
function userInitials(user) {
  if (user?.full_name) {
    const parts = user.full_name.trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
  }
  return user?.email?.[0]?.toUpperCase() || "?";
}

export default function App() {
  const today = new Date();
  const router = useRouter();
  const { user } = useAuth();

  // Preload the /week route chunk so tapping the card navigates instantly.
  useEffect(() => {
    router.prefetch("/week");
  }, [router]);

  const weekStart = dateKey(weekDays(today)[0]);
  const weekEnd = dateKey(weekDays(today)[6]);
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = dateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const { tasksByDate, isLoading, isError, refetch, addTask, toggleTask, deleteTask, reorderTasks } = useRitualTasks({
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
  });

  const initials = userInitials(user);

  return (
    <div style={{ background: COLORS.bg, color: COLORS.hi, height: "100dvh", maxHeight: "100dvh", overflow: "hidden", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      {isLoading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${COLORS.border}`, borderTopColor: COLORS.accent, animation: "ritualSpin 0.7s linear infinite" }} />
        </div>
      ) : (
        <>
          {isError && (
            <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#B91C1C", fontSize: 13, textAlign: "center" }}>
              Failed to load tasks.{" "}
              <button type="button" onClick={() => refetch()} style={{ textDecoration: "underline", cursor: "pointer", color: "inherit" }}>
                Retry
              </button>
            </div>
          )}
          <DayView
            key="day"
            date={today}
            tasksByDate={tasksByDate}
            addTask={addTask}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            reorderTasks={reorderTasks}
            userInitials={initials}
            onOpenWeek={() => router.push("/week")}
          />
        </>
      )}
    </div>
  );
}

/* ---------------- Week Page App (standalone route) ---------------- */
export function WeekApp() {
  const today = new Date();
  const router = useRouter();

  // Preload the home route chunk so the back button navigates instantly.
  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [monthOpen, setMonthOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(today);

  const anchorWeekDays = weekDays(anchor);
  const weekStart = dateKey(anchorWeekDays[0]);
  const weekEnd = dateKey(anchorWeekDays[6]);
  const monthStart = `${monthAnchor.getFullYear()}-${String(monthAnchor.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = dateKey(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0));

  const { tasksByDate, isLoading, isWeekLoading, isMonthLoading, isError, refetch, addTask, toggleTask, deleteTask, reorderTasks } =
    useRitualTasks({ weekStart, weekEnd, monthStart, monthEnd });

  return (
    <div style={{ background: COLORS.bg, color: COLORS.hi, height: "100dvh", maxHeight: "100dvh", overflow: "hidden", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      {isLoading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${COLORS.border}`, borderTopColor: COLORS.accent, animation: "ritualSpin 0.7s linear infinite" }} />
        </div>
      ) : (
        <>
          {isError && (
            <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#B91C1C", fontSize: 13, textAlign: "center" }}>
              Failed to load tasks.{" "}
              <button type="button" onClick={() => refetch()} style={{ textDecoration: "underline", cursor: "pointer", color: "inherit" }}>
                Retry
              </button>
            </div>
          )}
          <WeekView
            anchor={anchor}
            setAnchor={setAnchor}
            selected={selected}
            setSelected={setSelected}
            tasksByDate={tasksByDate}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            addTask={addTask}
            reorderTasks={reorderTasks}
            isWeekLoading={isWeekLoading}
            onBack={() => router.push("/")}
            onOpenMonth={() => setMonthOpen(true)}
          />
          {monthOpen && (
            <MonthSheet
              monthAnchor={monthAnchor}
              onMonthAnchorChange={setMonthAnchor}
              tasksByDate={tasksByDate}
              isLoading={isMonthLoading}
              onClose={() => setMonthOpen(false)}
              onSelectDate={(d) => {
                setAnchor(d);
                setSelected(d);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}