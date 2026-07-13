'use client';

import { Repeat } from 'lucide-react';
import type { RecurrenceUnit } from '@/types';
import { COLORS, cardStyle } from './theme';

export interface RecurrenceValue {
  recurrence_unit: RecurrenceUnit | null;
  recurrence_interval: number | null;
  recurrence_weekdays: number | null;
}

type Preset = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'none', label: 'Never' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'custom', label: 'Custom' },
];

// bit 0 = Monday ... bit 6 = Sunday (same convention as the backend)
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function presetOf(value: RecurrenceValue): Preset {
  const { recurrence_unit: unit, recurrence_interval: interval } = value;
  if (!unit) return 'none';
  if ((interval ?? 1) !== 1) return 'custom';
  if (unit === 'day') return 'daily';
  if (unit === 'week') return 'weekly';
  if (unit === 'month') return 'monthly';
  return 'yearly';
}

export function RepeatPicker({
  value,
  defaultWeekdayBit,
  onChange,
}: {
  value: RecurrenceValue;
  /** Weekday bit of the task's due date (or today) — the initial weekly selection. */
  defaultWeekdayBit: number;
  onChange: (next: RecurrenceValue) => void;
}) {
  const preset = presetOf(value);
  const unit = value.recurrence_unit;
  const interval = value.recurrence_interval ?? 1;
  const weekdays = value.recurrence_weekdays ?? defaultWeekdayBit;

  function pickPreset(next: Preset) {
    if (next === preset && next !== 'none') return;
    switch (next) {
      case 'none':
        onChange({ recurrence_unit: null, recurrence_interval: null, recurrence_weekdays: null });
        break;
      case 'daily':
        onChange({ recurrence_unit: 'day', recurrence_interval: 1, recurrence_weekdays: null });
        break;
      case 'weekly':
        onChange({ recurrence_unit: 'week', recurrence_interval: 1, recurrence_weekdays: weekdays });
        break;
      case 'monthly':
        onChange({ recurrence_unit: 'month', recurrence_interval: 1, recurrence_weekdays: null });
        break;
      case 'yearly':
        onChange({ recurrence_unit: 'year', recurrence_interval: 1, recurrence_weekdays: null });
        break;
      case 'custom':
        onChange({ recurrence_unit: unit ?? 'day', recurrence_interval: Math.max(2, interval), recurrence_weekdays: unit === 'week' ? weekdays : null });
        break;
    }
  }

  function toggleWeekday(bit: number) {
    const next = weekdays ^ (1 << bit);
    if (next === 0) return; // at least one day must stay selected
    onChange({ recurrence_unit: 'week', recurrence_interval: interval, recurrence_weekdays: next });
  }

  function setCustom(nextInterval: number, nextUnit: RecurrenceUnit) {
    onChange({
      recurrence_unit: nextUnit,
      recurrence_interval: Math.max(1, nextInterval),
      recurrence_weekdays: nextUnit === 'week' ? weekdays : null,
    });
  }

  const showWeekdays = unit === 'week';

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Repeat size={18} color={unit ? COLORS.accent : COLORS.mid} />
        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.hi }}>Repeat</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {PRESETS.map((p) => {
          const active = p.key === preset;
          return (
            <button
              key={p.key}
              onClick={() => pickPreset(p.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                background: active ? COLORS.accentLight : 'transparent',
                color: active ? COLORS.accent : COLORS.mid,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {preset === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 13, color: COLORS.mid }}>Every</span>
          <input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setCustom(Number(e.target.value) || 1, unit ?? 'day')}
            style={{
              width: 56,
              padding: '6px 8px',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              fontSize: 13,
              color: COLORS.hi,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <select
            value={unit ?? 'day'}
            onChange={(e) => setCustom(interval, e.target.value as RecurrenceUnit)}
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              fontSize: 13,
              color: COLORS.hi,
              fontFamily: 'inherit',
              background: 'transparent',
              outline: 'none',
            }}
          >
            <option value="day">days</option>
            <option value="week">weeks</option>
            <option value="month">months</option>
            <option value="year">years</option>
          </select>
        </div>
      )}

      {showWeekdays && (
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {WEEKDAYS.map((label, bit) => {
            const active = Boolean(weekdays & (1 << bit));
            return (
              <button
                key={bit}
                onClick={() => toggleWeekday(bit)}
                aria-pressed={active}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                  background: active ? COLORS.accent : 'transparent',
                  color: active ? '#FFFFFF' : COLORS.mid,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
