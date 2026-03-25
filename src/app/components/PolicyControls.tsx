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
    <div className="space-y-3 pt-2 border-t border-white/5">
      <p className="text-xs font-medium text-[#14b8a6]">Scheduling Policy</p>

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
        <div className="space-y-3 pl-2">
          {/* Buffer time */}
          <div>
            <label className="text-xs text-[#888]">Travel buffer</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={0}
                max={120}
                step={15}
                value={policy.minBufferMinutes}
                onChange={(e) => onChange({ ...policy, minBufferMinutes: Number(e.target.value) })}
                className="flex-1 accent-[#14b8a6] h-1"
              />
              <span className="text-xs text-white w-14 text-right">
                {policy.minBufferMinutes} min
              </span>
            </div>
          </div>

          {/* Allowed hours */}
          <div>
            <label className="text-xs text-[#888]">Allowed hours</label>
            <div className="flex items-center gap-2 mt-1">
              <TimeSelect
                value={policy.allowedHoursStart}
                onChange={(v) => onChange({ ...policy, allowedHoursStart: v })}
              />
              <span className="text-xs text-[#555]">to</span>
              <TimeSelect
                value={policy.allowedHoursEnd}
                onChange={(v) => onChange({ ...policy, allowedHoursEnd: v })}
              />
            </div>
          </div>

          {/* Max per week */}
          <div>
            <label className="text-xs text-[#888]">Max appointments per week</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={1}
                max={10}
                value={policy.maxPerWeek}
                onChange={(e) => onChange({ ...policy, maxPerWeek: Number(e.target.value) })}
                className="flex-1 accent-[#14b8a6] h-1"
              />
              <span className="text-xs text-white w-8 text-right">{policy.maxPerWeek}</span>
            </div>
          </div>

          {/* Allowed days */}
          <div>
            <label className="text-xs text-[#888]">Allowed days</label>
            <div className="flex gap-1 mt-1">
              {DAY_LABELS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => {
                    const next = policy.allowedDays.includes(i)
                      ? policy.allowedDays.filter((d) => d !== i)
                      : [...policy.allowedDays, i].sort()
                    onChange({ ...policy, allowedDays: next })
                  }}
                  className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                    policy.allowedDays.includes(i)
                      ? 'bg-[#14b8a6]/20 text-[#14b8a6] border border-[#14b8a6]/30'
                      : 'bg-white/5 text-[#555] border border-white/5'
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
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-[#555]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-[#14b8a6]' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
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
      className="bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-[#14b8a6]/50"
    >
      {Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={i} className="bg-[#08090d]">
          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
        </option>
      ))}
    </select>
  )
}
