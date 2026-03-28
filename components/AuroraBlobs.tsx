'use client'

import { motion } from 'framer-motion'

export function AuroraBlobs() {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
            <motion.div
                className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-[#FC4C02]/[0.03] blur-[100px]"
                animate={{
                    x: [0, 80, -40, 0],
                    y: [0, -60, 40, 0],
                    scale: [1, 1.15, 0.95, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute top-[30%] -right-[15%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] rounded-full bg-[#FC4C02]/[0.025] blur-[120px]"
                animate={{
                    x: [0, -70, 50, 0],
                    y: [0, 50, -30, 0],
                    scale: [1, 0.9, 1.1, 1],
                }}
                transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-[10%] left-[30%] w-[40vw] h-[40vw] max-w-[450px] max-h-[450px] rounded-full bg-amber-500/[0.02] blur-[100px]"
                animate={{
                    x: [0, 60, -80, 0],
                    y: [0, -40, 20, 0],
                    scale: [1, 1.1, 0.9, 1],
                }}
                transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
            />
        </div>
    )
}
