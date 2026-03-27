'use client'

export interface Policy {
  autoApprove: boolean
  autoBook: boolean
  minBufferMinutes: number
  allowedHoursStart: number
  allowedHoursEnd: number
  maxPerWeek: number
  allowedDays: number[]
}

export const DEFAULT_POLICY: Policy = {
  autoApprove: false,
  autoBook: false,
  minBufferMinutes: 30,
  allowedHoursStart: 9,
  allowedHoursEnd: 17,
  maxPerWeek: 3,
  allowedDays: [1, 2, 3, 4, 5],
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

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
    <div className="rounded-xl bg-[#fff8cb] border border-[rgba(180,83,9,0.15)] p-4 flex flex-col gap-4">
      <p className="text-[11px] font-bold text-[#0d9488] uppercase tracking-wide">Scheduling policy</p>

      <ToggleRow
        label="Auto-approve requests"
        desc="Approve appointment requests automatically"
        checked={policy.autoApprove}
        onChange={v => onChange({ ...policy, autoApprove: v, autoBook: v ? policy.autoBook : false })}
      />

      {policy.autoApprove && (
        <>
          <ToggleRow
            label="Auto-book"
            desc="Agent books directly — no approval needed"
            checked={policy.autoBook}
            onChange={v => onChange({ ...policy, autoBook: v })}
          />

          <div className="h-px bg-[rgba(180,83,9,0.1)]" />

          {/* Buffer */}
          <SliderRow
            label="Travel buffer"
            value={policy.minBufferMinutes}
            display={`${policy.minBufferMinutes} min`}
            min={0} max={120} step={15}
            onChange={v => onChange({ ...policy, minBufferMinutes: v })}
          />

          {/* Max per week */}
          <SliderRow
            label="Max per week"
            value={policy.maxPerWeek}
            display={`${policy.maxPerWeek}`}
            min={1} max={10} step={1}
            onChange={v => onChange({ ...policy, maxPerWeek: v })}
          />

          {/* Allowed hours */}
          <div>
            <p className="text-xs font-semibold text-[#6b7280] mb-2">Allowed hours</p>
            <div className="flex items-center gap-2">
              <TimeSelect value={policy.allowedHoursStart} onChange={v => onChange({ ...policy, allowedHoursStart: v })} />
              <span className="text-xs text-[#9ca3af]">to</span>
              <TimeSelect value={policy.allowedHoursEnd} onChange={v => onChange({ ...policy, allowedHoursEnd: v })} />
            </div>
          </div>

          {/* Allowed days */}
          <div>
            <p className="text-xs font-semibold text-[#6b7280] mb-2">Allowed days</p>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => {
                    const next = policy.allowedDays.includes(i)
                      ? policy.allowedDays.filter(d => d !== i)
                      : [...policy.allowedDays, i].sort()
                    onChange({ ...policy, allowedDays: next })
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    policy.allowedDays.includes(i)
                      ? 'bg-[#0d9488] text-white'
                      : 'bg-white text-[#9ca3af] border border-[#e5e7eb]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ToggleRow({
  label, desc, checked, onChange,
}: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#02043d]">{label}</p>
        <p className="text-xs text-[#9ca3af] mt-0.5">{desc}</p>
      </div>
      <label className="bm-toggle">
        <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} />
        <span className="bm-toggle-track" />
      </label>
    </div>
  )
}

function SliderRow({
  label, value, display, min, max, step, onChange,
}: {
  label: string; value: number; display: string
  min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-[#6b7280]">{label}</p>
        <span className="text-xs font-bold text-[#02043d] bg-white px-2 py-0.5 rounded-md border border-[#e5e7eb]">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#0d9488] h-1.5 rounded-full"
      />
    </div>
  )
}

function TimeSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="bg-white border border-[#e5e7eb] rounded-lg text-xs font-semibold text-[#02043d] px-2.5 py-1.5 focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/20 transition-all"
    >
      {Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={i}>
          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
        </option>
      ))}
    </select>
  )
}
