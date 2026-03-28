'use client'

import { motion } from 'framer-motion'
import StravaAuthButton from './StravaAuthButton'
import { AuroraBlobs } from './AuroraBlobs'

export default function LoginHero() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0c10] px-4 relative overflow-hidden">
            <AuroraBlobs />

            {/* Dot pattern */}
            <div className="absolute inset-0 dot-pattern pointer-events-none" />

            <motion.div
                className="relative z-10 w-full max-w-md text-center space-y-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="space-y-4">
                    {/* Animated logo with glow ring */}
                    <motion.div
                        className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#FC4C02]/10 border border-[#FC4C02]/20 mb-2 relative"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                    >
                        <div className="absolute inset-[-8px] rounded-3xl bg-[#FC4C02]/[0.08] blur-xl animate-pulse" />
                        <div className="absolute inset-[-2px] rounded-[18px] border border-[#FC4C02]/10" />
                        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-[#FC4C02] relative" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                        </svg>
                    </motion.div>

                    {/* Shimmer title */}
                    <motion.h1
                        className="text-3xl sm:text-5xl font-bold tracking-tight shimmer-text"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.25 }}
                    >
                        Strava Visualiser
                    </motion.h1>

                    <motion.p
                        className="text-[#71717a] text-base leading-relaxed max-w-xs mx-auto"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        Connect your Strava account to explore your training data with beautiful visualisations.
                    </motion.p>
                </div>

                {/* CTA with glow */}
                <motion.div
                    className="pt-2"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                >
                    <StravaAuthButton />
                </motion.div>

                <motion.p
                    className="text-[#3f3f46] text-xs"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                >
                    Your data stays private. We only read your activity history.
                </motion.p>
            </motion.div>
        </div>
    )
}
