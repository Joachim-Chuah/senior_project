import React, { createContext, useContext, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const CardCurtainRevealContext = createContext({ isHovered: false })

function CardCurtainReveal({ className, children, ...props }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <CardCurtainRevealContext.Provider value={{ isHovered }}>
      <div
        className={cn('relative overflow-hidden', className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </div>
    </CardCurtainRevealContext.Provider>
  )
}

function CardCurtainRevealBody({ className, children, ...props }) {
  return (
    <div className={cn('relative z-10 flex flex-1 flex-col p-6', className)} {...props}>
      {children}
    </div>
  )
}

function CardCurtainRevealTitle({ className, children, ...props }) {
  const { isHovered } = useContext(CardCurtainRevealContext)

  return (
    <motion.div
      className={cn('relative', className)}
      animate={{ y: isHovered ? 0 : 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

function CardCurtainRevealDescription({ className, children, ...props }) {
  const { isHovered } = useContext(CardCurtainRevealContext)

  return (
    <motion.div
      className={cn('overflow-hidden', className)}
      initial={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' }}
      animate={{
        clipPath: isHovered
          ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
          : 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
      }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

function CardCurtainRevealFooter({ className, children, ...props }) {
  const { isHovered } = useContext(CardCurtainRevealContext)

  return (
    <motion.div
      className={cn('relative z-10', className)}
      initial={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' }}
      animate={{
        clipPath: isHovered
          ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
          : 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
      }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: isHovered ? 0.05 : 0 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

function CardCurtain({ className, ...props }) {
  const { isHovered } = useContext(CardCurtainRevealContext)

  return (
    <motion.div
      className={cn('pointer-events-none absolute inset-0 z-0', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: isHovered ? 1 : 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: 'var(--surface-2)', mixBlendMode: 'normal' }}
      {...props}
    />
  )
}

export {
  CardCurtainReveal,
  CardCurtainRevealBody,
  CardCurtainRevealTitle,
  CardCurtainRevealDescription,
  CardCurtainRevealFooter,
  CardCurtain,
}
