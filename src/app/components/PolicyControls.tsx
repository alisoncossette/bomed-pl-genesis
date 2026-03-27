'use client'

import { useState } from 'react'

export interface Policy {
  autoApprove: boolean
  autoBook: boolean
  minBufferMinutes: number
  allowedHoursStart: number
  allowedHoursEnd: number
  maxPerWeek: number
  allowedDays: number[] // 0=Sun, 1=Mon, ...
}

export const DEFAULT_POLICY: Policy = {
  autoApprove: false,
  autoBook: false,
  minBufferMinutes: 30,
  allowedHoursStart: 9,
  allowedHoursEnd: 17,
  maxPerWeek: 3,
  allowedDays: [1, 2, 3, 4, 5], // weekdays
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function PolicyControls({
  policy,
  onChange,
  scopeHasAppointments,
}: {
  policy: Policy
  onChange: (p: Policy) => void
  scopeHasAppointments: boolean
}) {
  if (!scopeHasAppointments) return null

  return (
    <div className="space-y-4 pt-4 border-t border-white/10">
      <p className="text-xs font-bold text-[#3A7D8F] uppercase tracking-wide">Scheduling Policy</p>

      {/* Auto-approve toggle */}
      <ToggleRow
        label="Auto-approve requests"
        description="Approve appointment requests automatically"
        checked={policy.autoApprove}
        onChange={(v) => onChange({ ...policy, autoApprove: v, autoBook: v ? policy.autoBook : false })}
      />

      {/* Auto-book toggle — only if auto-approve is on */}
      {policy.autoApprove && (
        <ToggleRow
          label="Auto-book"
          description="Agent books directly — no approval needed"
          checked={policy.autoBook}
          onChange={(v) => onChange({ ...policy, autoBook: v })}
        />
      )}

      {/* Policy details — show when either auto mode is on */}
      {policy.autoApprove && (
        <div className="space-y-4 pl-2">
          {/* Buffer time */}
          <div>
            <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-2 block">Travel buffer</label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="range"
                min={0}
                max={120}
                step={15}
                value={policy.minBufferMinutes}
                onChange={(e) => onChange({ ...policy, minBufferMinutes: Number(e.target.value) })}
                className="flex-1 accent-[#285661] h-2 rounded-full"
              />
              <span className="text-xs font-bold text-white w-16 text-right bg-[#141440] px-2.5 py-1.5 rounded-lg">
                {policy.minBufferMinutes} min
              </span>
            </div>
          </div>

          {/* Allowed hours */}
          <div>
            <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-2 block">Allowed hours</label>
            <div className="flex items-center gap-2 mt-2">
              <TimeSelect
                value={policy.allowedHoursStart}
                onChange={(v) => onChange({ ...policy, allowedHoursStart: v })}
              />
              <span className="text-xs font-medium text-[#6B7280]">to</span>
              <TimeSelect
                value={policy.allowedHoursEnd}
                onChange={(v) => onChange({ ...policy, allowedHoursEnd: v })}
              />
            </div>
          </div>

          {/* Max per week */}
          <div>
            <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-2 block">Max appointments per week</label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="range"
                min={1}
                max={10}
                value={policy.maxPerWeek}
                onChange={(e) => onChange({ ...policy, maxPerWeek: Number(e.target.value) })}
                className="flex-1 accent-[#285661] h-2 rounded-full"
              />
              <span className="text-xs font-bold text-white w-10 text-right bg-[#141440] px-2.5 py-1.5 rounded-lg">{policy.maxPerWeek}</span>
            </div>
          </div>

          {/* Allowed days */}
          <div>
            <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-2 block">Allowed days</label>
            <div className="flex gap-1.5 mt-2">
              {DAY_LABELS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => {
                    const next = policy.allowedDays.includes(i)
                      ? policy.allowedDays.filter((d) => d !== i)
                      : [...policy.allowedDays, i].sort()
                    onChange({ ...policy, allowedDays: next })
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    policy.allowedDays.includes(i)
                      ? 'bg-[#285661]/30 text-[#94C7E0] border border-[#285661]/50 shadow-md'
                      : 'bg-white/5 text-[#6B7280] border border-white/8'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-bold text-white mb-0.5">{label}</p>
        <p className="text-xs text-[#9CA3AF]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-all shadow-md ${
          checked ? 'bg-gradient-to-r from-[#285661] to-[#3A7D8F]' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function TimeSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-[#141440] border border-white/10 rounded-lg text-xs font-semibold text-white px-3 py-2 focus:outline-none focus:border-[#285661] focus:ring-2 focus:ring-[#285661]/20 transition-all"
    >
      {Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={i} className="bg-[#141440]">
          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
        </option>
      ))}
    </select>
  )
}
