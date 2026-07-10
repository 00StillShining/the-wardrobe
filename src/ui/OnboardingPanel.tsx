import { motion } from 'framer-motion'
import { ArrowRight, HardDrive, Plus } from 'lucide-react'

export function OnboardingPanel({ onAdd, onExplore }: { onAdd: () => void; onExplore: () => void }) {
  return (
    <motion.div className="modal-backdrop onboarding-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section
        className="onboarding-panel paper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.28 }}
      >
        <span className="onboarding-mark" aria-hidden="true"><HardDrive size={18} /></span>
        <span className="panel-kicker">Private by default</span>
        <h2 id="onboarding-title" className="paper-serif">Make the wardrobe yours</h2>
        <p>Add a piece now or begin with the sample collection already on the rail.</p>
        <div className="onboarding-actions">
          <button type="button" className="btn btn-primary icon-text-button" onClick={onAdd} autoFocus>
            <Plus size={15} aria-hidden="true" /> Add a piece
          </button>
          <button type="button" className="btn btn-ghost icon-text-button" onClick={onExplore}>
            Explore wardrobe <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </motion.section>
    </motion.div>
  )
}
