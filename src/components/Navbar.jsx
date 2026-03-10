import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, Menu, X, Sparkles } from 'lucide-react'

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'StoryWeaver', path: '/storyweaver' },
        { name: 'Digital Elder', path: '/digital-elder' },
        { name: 'Pronunciation Lab', path: '/pronunciation-lab' },
    ]

    return (
        <nav
            className="fixed w-full z-50 transition-all duration-500 ease-in-out"
            style={{
                padding: scrolled ? '10px 0' : '18px 0',
                background: scrolled ? 'rgba(10, 26, 15, 0.9)' : 'transparent',
                backdropFilter: scrolled ? 'blur(24px)' : 'none',
                WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(200, 164, 92, 0.18)' : '1px solid transparent',
                boxShadow: scrolled ? '0 8px 40px rgba(0,0,0,0.3), 0 1px 0 rgba(200,164,92,0.06)' : 'none',
            }}
        >
            <div className="px-6 lg:px-10" style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
                <div className="relative flex items-center justify-between w-full">

                    {/* ── Left: Logo ── */}
                    <div className="flex shrink-0">
                        <Link to="/" className="flex items-center gap-3 group no-underline">
                            {/* Icon */}
                            <div
                                className="relative w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_18px_rgba(200,164,92,0.35)]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(200,164,92,0.22) 0%, rgba(200,164,92,0.06) 100%)',
                                    border: '1px solid rgba(200,164,92,0.45)',
                                }}
                            >
                                <Leaf
                                    size={16}
                                    className="text-[var(--accent)] relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                                />
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{ background: 'radial-gradient(circle at center, rgba(200,164,92,0.22) 0%, transparent 70%)' }}
                                />
                            </div>
                            {/* Wordmark + tagline */}
                            <div className="flex flex-col leading-none gap-[4px]">
                                <span className="text-[24px] font-bold tracking-tight leading-none whitespace-nowrap" style={{ fontFamily: 'var(--font-heading)' }}>
                                    <span className="text-[var(--text-primary)]">Echo</span>
                                    <span className="text-[var(--accent)]">Roots</span>
                                </span>
                                <span
                                    className="text-[9px] tracking-[0.22em] font-medium uppercase leading-none whitespace-nowrap"
                                    style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
                                >
                                    Cultural AI
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* ── Center: Desktop Nav Links ── */}
                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-6 lg:gap-10">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.path
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`relative py-2 text-[16px] font-medium tracking-wide whitespace-nowrap no-underline transition-all duration-300 ${isActive
                                        ? 'text-[var(--accent)]'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {link.name}
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-active-bar"
                                            className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full"
                                            style={{ background: 'var(--accent)' }}
                                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            )
                        })}
                    </div>

                    {/* ── Right: Mobile Trigger ── */}
                    <div className="flex shrink-0 items-center">
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors cursor-pointer p-2 shrink-0"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                </div>
            </div>

            {/* ── Mobile Menu Overlay ── */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 top-[64px] backdrop-blur-2xl z-40 flex flex-col pt-12 px-8"
                        style={{ background: 'rgba(10,26,15,0.97)' }}
                    >
                        {/* Gold top border on mobile menu */}
                        <div className="absolute top-0 left-0 right-0 h-px"
                            style={{ background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.3), transparent)' }} />

                        <div className="flex flex-col gap-7">
                            {navLinks.map((link, i) => {
                                const isActive = location.pathname === link.path
                                return (
                                    <motion.div
                                        key={link.path}
                                        initial={{ opacity: 0, x: 24 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.08, duration: 0.4 }}
                                    >
                                        <Link
                                            to={link.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="text-4xl block font-medium no-underline tracking-wide transition-colors duration-200"
                                            style={{
                                                fontFamily: 'var(--font-heading)',
                                                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                                            }}
                                        >
                                            {link.name}
                                        </Link>
                                        {isActive && (
                                            <div className="mt-1 h-px w-16"
                                                style={{ background: 'linear-gradient(to right, var(--accent), transparent)' }} />
                                        )}
                                    </motion.div>
                                )
                            })}
                        </div>

                        {/* Mobile CTA */}
                        <div className="mt-auto mb-12">
                            <Link to="/storyweaver" className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                                <button
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-bold cursor-pointer"
                                    style={{
                                        background: 'linear-gradient(135deg, #e0ba6e, #c8a45c)',
                                        color: 'var(--bg-deep)',
                                    }}
                                >
                                    <Sparkles size={16} />
                                    Begin Journey
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
