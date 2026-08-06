const STYLE = {
  ok: 'bg-emerald-400/10 ring-1 ring-emerald-400/40 text-emerald-300',
  running: 'bg-emerald-400/10 ring-1 ring-emerald-400/40 text-emerald-300',
  loading: 'bg-brew-amber/10 ring-1 ring-brew-amber/30 text-brew-amber',
  crashed: 'bg-red-500/10 ring-1 ring-red-500/40 text-red-400',
  failed: 'bg-red-500/10 ring-1 ring-red-500/40 text-red-400'
};

function Chip({ label, status }) {
  if (!status || !STYLE[status]) return null;
  const text = (status === 'crashed' || status === 'failed') ? `${label} ✕` : label;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[calc(var(--uh)*1.6)] font-semibold tracking-widest ${STYLE[status] || ''}`}>
      {text}
    </span>
  );
}

export default function HealthChips({ health, hasService }) {
  const userscript = health && health.userscript ? health.userscript.status : null;
  const service = health && health.service ? health.service.status : null;

  return (
    <div className="mt-4 flex items-center gap-2">
      <Chip label="SCRIPT" status={userscript} />
      {hasService && <Chip label="SVC" status={service} />}
    </div>
  );
}