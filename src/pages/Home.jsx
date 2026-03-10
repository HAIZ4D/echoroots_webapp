import ParticleBackground from '../components/ui/ParticleBackground'
import HeroSection from '../components/home/HeroSection'
import ThreePillars from '../components/home/ThreePillars'
import ElderShowcase from '../components/home/ElderShowcase'
import PipelineSection from '../components/home/PipelineSection'
import ImpactSection from '../components/home/ImpactSection'

export default function Home() {
    return (
        <div className="min-h-screen relative bg-[var(--bg-deep)] selection:bg-[var(--accent)] selection:text-[var(--bg-deep)]" id="home-page">
            <ParticleBackground count={18} speed={0.2} maxOpacity={0.25} />

            <div className="relative z-10 flex flex-col gap-24 sm:gap-32 pb-24">
                <HeroSection />
                <ThreePillars />
                <ElderShowcase />
                <PipelineSection />
                <ImpactSection />
            </div>
        </div>
    )
}
