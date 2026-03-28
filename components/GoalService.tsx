'use client'

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Target, TrendingUp, TrendingDown } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'
import { SpotlightCard } from './SpotlightCard'

interface GoalServiceProps {
    ytdDistance: number
}

export function GoalService({ ytdDistance }: GoalServiceProps) {
    const [goalDistance, setGoalDistance] = useState(3000)
    const [daysIntoYear, setDaysIntoYear] = useState(0)
    const [expectedDistance, setExpectedDistance] = useState(0)

    useEffect(() => {
        const now = new Date()
        const start = new Date(now.getFullYear(), 0, 0)
        const diff = now.getTime() - start.getTime()
        const oneDay = 1000 * 60 * 60 * 24
        const day = Math.floor(diff / oneDay)
        setDaysIntoYear(day)
        setExpectedDistance((day / 365) * goalDistance)
    }, [goalDistance])

    const ytdKm = ytdDistance / 1000
    const percentageComplete = Math.min(100, (ytdKm / goalDistance) * 100)
    const distanceDifference = ytdKm - expectedDistance
    const isAhead = distanceDifference > 0

    return (
        <SpotlightCard className="rounded-xl bg-[#16161d] border border-white/[0.06] overflow-hidden h-full card-glow" spotlightSize={300}>
            <div className="h-0.5 w-full bg-gradient-to-r from-[#FC4C02] to-amber-400" />
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#71717a]" />
                    <span className="text-sm font-medium text-[#a1a1aa]">Annual Distance Goal</span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-[#71717a]">Goal</span>
                    <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5">
                        <input
                            type="number"
                            value={goalDistance}
                            onChange={(e) => setGoalDistance(Number(e.target.value))}
                            className="w-20 bg-transparent text-white text-sm font-medium outline-none tabular-nums"
                        />
                        <span className="text-[#52525b] text-sm">km</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <span className="text-3xl font-bold text-white tabular-nums">
                            <AnimatedNumber
                                value={ytdKm}
                                duration={1.5}
                                format={(v) => v.toFixed(1)}
                            /> km
                        </span>
                        <span className="text-sm text-[#52525b]">of {goalDistance} km</span>
                    </div>

                    {/* Animated progress bar with glow */}
                    <div className="relative h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FC4C02] to-amber-400 progress-glow"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentageComplete}%` }}
                            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-[#52525b]">
                        <span>
                            <AnimatedNumber
                                value={percentageComplete}
                                format={(v) => `${v.toFixed(1)}%`}
                            /> complete
                        </span>
                        <span>{(goalDistance - ytdKm).toFixed(1)} km remaining</span>
                    </div>
                </div>

                <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[#52525b] uppercase tracking-wide">Pace vs Expected</span>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${isAhead ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isAhead ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            <AnimatedNumber
                                value={Math.abs(distanceDifference)}
                                format={(v) => `${isAhead ? '+' : '-'}${v.toFixed(1)} km`}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-[#52525b]">Expected</span>
                            <span className="text-sm font-medium text-white tabular-nums">{expectedDistance.toFixed(1)} km</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-[#52525b]">Day</span>
                            <span className="text-sm font-medium text-white tabular-nums">{daysIntoYear} / 365</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-[#52525b]">Remaining</span>
                            <span className="text-sm font-medium text-white tabular-nums">{365 - daysIntoYear} days</span>
                        </div>
                    </div>
                </div>
            </div>
        </SpotlightCard>
    )
}
