import { motion } from 'framer-motion'
import { PackageOpen, Plus } from 'lucide-react'

export function EmptyWardrobe({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div className="empty-wardrobe paper" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      <PackageOpen size={22} aria-hidden="true" />
      <h2 className="paper-serif">Your wardrobe is empty</h2>
      <button type="button" className="btn btn-primary icon-text-button" onClick={onAdd}>
        <Plus size={15} aria-hidden="true" /> Add your first piece
      </button>
    </motion.div>
  )
}
