export default function SectionBadge({ text, dot = true, className = "" }) {
    return (
        <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full premium-glass backdrop-blur-md border border-[var(--accent)] border-opacity-30 ${className}`}>
            {dot && (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                </span>
            )}
            <span
                className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]"
                style={{ fontFamily: 'var(--font-mono)' }}
            >
                {text}
            </span>
        </div>
    )
}
