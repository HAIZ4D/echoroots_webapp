import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { seedKnowledgeBase } from './services/rag'

// Expose seeding function to the browser console for easy setup
window.seedDB = async () => {
  console.log("Seeding started...");
  const res = await seedKnowledgeBase();
  console.log("Seeding finished. Items added:", res.seededCount);
}

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import StoryWeaver from './pages/StoryWeaver'
import DigitalElder from './pages/DigitalElder'
import PronunciationLab from './pages/PronunciationLab'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/storyweaver" element={<StoryWeaver />} />
        <Route path="/digital-elder" element={<DigitalElder />} />
        <Route path="/pronunciation-lab" element={<PronunciationLab />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <Navbar />
        <AnimatedRoutes />
        <Footer />
      </div>
    </BrowserRouter>
  )
}
