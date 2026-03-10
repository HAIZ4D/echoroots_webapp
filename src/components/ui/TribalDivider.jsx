export default function TribalDivider({ color = 'var(--accent)', opacity = 0.3, className = '' }) {
    return (
        <div className={`flex justify-center w-full px-4 overflow-hidden ${className}`}>
            <svg
                viewBox="0 0 1000 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full max-w-4xl"
                preserveAspectRatio="none"
                style={{ opacity }}
            >
                {/* 
                    Organic, handcrafted line mimicking woven rattan or tribal carvings.
                    Slightly wavy and intersecting rather than purely geometric.
                */}
                <path
                    d="M0 10 C 250 10, 250 18, 500 10 C 750 2, 750 10, 1000 10"
                    stroke={color}
                    strokeWidth="1"
                    strokeDasharray="4 6"
                />
                <path
                    d="M0 10 C 250 2, 250 18, 500 10 C 750 0, 750 20, 1000 10"
                    stroke={color}
                    strokeWidth="0.5"
                />
                {/* Center diamond motif */}
                <path d="M495 10 L500 5 L505 10 L500 15 Z" fill={color} opacity="0.8" />
            </svg>
        </div>
    )
}
