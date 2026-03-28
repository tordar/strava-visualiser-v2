'use client'

import { ElementType } from 'react'
import { motion } from 'framer-motion'
import { GoalService } from "./GoalService"
import { Activity, Award, Zap } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'
import { SpotlightCard } from './SpotlightCard'

interface AthleteStats {
    recent_run_totals: { count: number; distance: number; moving_time: number; elevation_gain: number }
    ytd_run_totals:    { count: number; distance: number; moving_time: number; elevation_gain: number }
    all_run_totals:    { count: number; distance: number; moving_time: number; elevation_gain: number }
}

interface StatsProps {
    athleteStats: AthleteStats
    formatDistance: (distance: number) => string
    formatDuration: (seconds: number) => string
}

interface StatItem {
    label: string
    value: number
    format: (n: number) => string
}

function StatCard({
    icon: Icon,
    title,
    accent,
    stats,
    index,
}: {
    icon: ElementType
    title: string
    accent: string
    stats: StatItem[]
    index: number
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
            <SpotlightCard className="rounded-xl bg-[#16161d] border border-white/[0.06] overflow-hidden card-glow">
                <div className={`h-0.5 w-full ${accent}`} />
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Icon className="h-4 w-4 text-[#71717a]" />
                        <span className="text-sm font-medium text-[#a1a1aa]">{title}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                        {stats.map(({ label, value, format }) => (
                            <div key={label} className="flex flex-col gap-0.5">
                                <span className="text-xs text-[#52525b] uppercase tracking-wide">{label}</span>
                                <span className="text-xl font-bold text-white tabular-nums">
                                    <AnimatedNumber value={value} format={format} />
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </SpotlightCard>
        </motion.div>
    )
}

function formatKm(v: number): string {
    return `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / 1000)} km`
}

function formatDur(v: number): string {
    const hours = Math.floor(v / 3600)
    const minutes = Math.floor((v % 3600) / 60)
    return `${hours}h ${minutes}m`
}

function formatElev(v: number): string {
    return `${Math.round(v)} m`
}

function formatCount(v: number): string {
    return String(Math.round(v))
}

export function Stats({ athleteStats }: StatsProps) {
    const ytdDistance = athleteStats.ytd_run_totals.distance
    const allRunsTotal = athleteStats.all_run_totals.distance
    const recentRunsTotal = athleteStats.recent_run_totals.distance

    return (
        <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-1/3 space-y-3">
                <StatCard
                    icon={Activity}
                    title="All Time"
                    accent="bg-gradient-to-r from-[#FC4C02] to-[#ff7a3d]"
                    index={0}
                    stats={[
                        { label: "Runs", value: athleteStats.all_run_totals.count, format: formatCount },
                        { label: "Distance", value: allRunsTotal, format: formatKm },
                        { label: "Time", value: athleteStats.all_run_totals.moving_time, format: formatDur },
                        { label: "Elevation", value: athleteStats.all_run_totals.elevation_gain, format: formatElev },
                    ]}
                />
                <StatCard
                    icon={Award}
                    title="Year to Date"
                    accent="bg-gradient-to-r from-blue-500 to-blue-400"
                    index={1}
                    stats={[
                        { label: "Runs", value: athleteStats.ytd_run_totals.count, format: formatCount },
                        { label: "Distance", value: ytdDistance, format: formatKm },
                        { label: "Time", value: athleteStats.ytd_run_totals.moving_time, format: formatDur },
                        { label: "Elevation", value: athleteStats.ytd_run_totals.elevation_gain, format: formatElev },
                    ]}
                />
                <StatCard
                    icon={Zap}
                    title="Recent (4 weeks)"
                    accent="bg-gradient-to-r from-emerald-500 to-emerald-400"
                    index={2}
                    stats={[
                        { label: "Runs", value: athleteStats.recent_run_totals.count, format: formatCount },
                        { label: "Distance", value: recentRunsTotal, format: formatKm },
                        { label: "Time", value: athleteStats.recent_run_totals.moving_time, format: formatDur },
                        { label: "Elevation", value: athleteStats.recent_run_totals.elevation_gain, format: formatElev },
                    ]}
                />
            </div>
            <motion.div
                className="w-full lg:w-2/3"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
                <GoalService ytdDistance={ytdDistance} />
            </motion.div>
        </div>
    )
}
