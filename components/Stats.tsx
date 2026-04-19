'use client'

import { ElementType, useMemo } from 'react'
import { motion } from 'framer-motion'
import { GoalService } from "./GoalService"
import { Activity, Award, Zap } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'
import { SpotlightCard } from './SpotlightCard'
import { StravaActivity } from '@/types/strava'
import { PBStats } from './PBStats'
import { activityElevation } from '@/lib/utils'

interface StatsProps {
    activities: StravaActivity[]
    sportFilter: string
    sportTypes: string[]
    sportCounts: Record<string, number>
    onSportFilterChange: (filter: string) => void
}

interface Totals {
    count: number
    distance: number
    moving_time: number
    elevation_gain: number
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

export function Stats({ activities, sportFilter, sportTypes, sportCounts, onSportFilterChange }: StatsProps) {
    const filtered = useMemo(() =>
        sportFilter === 'all' ? activities : activities.filter(a => a.type === sportFilter)
    , [activities, sportFilter])

    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

    const aggregate = (list: StravaActivity[]): Totals => ({
        count: list.length,
        distance: list.reduce((s, a) => s + a.distance, 0),
        moving_time: list.reduce((s, a) => s + a.moving_time, 0),
        elevation_gain: list.reduce((s, a) => s + activityElevation(a), 0),
    })

    const allTime = useMemo(() => aggregate(filtered), [filtered])
    const ytd = useMemo(() => aggregate(filtered.filter(a => new Date(a.start_date_local) >= yearStart)), [filtered, yearStart])
    const recent = useMemo(() => aggregate(filtered.filter(a => new Date(a.start_date_local) >= fourWeeksAgo)), [filtered, fourWeeksAgo])

    const label = sportFilter === 'all' ? 'Activities' : sportFilter + 's'

    return (
        <div className="space-y-5 px-3 sm:px-0 pt-2 sm:pt-0">
            {/* Sport filter */}
            {sportTypes.length > 1 && (
                <div className="flex items-center gap-3">
                    <span className="text-xs text-[#52525b]">Favourite sport</span>
                    <select
                        value={sportFilter}
                        onChange={e => onSportFilterChange(e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#FC4C02]/30 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px' }}
                    >
                        <option value="all">All sports ({Object.values(sportCounts).reduce((a, b) => a + b, 0)})</option>
                        {sportTypes.map(type => (
                            <option key={type} value={type}>{type} ({sportCounts[type] || 0})</option>
                        ))}
                    </select>
                    {sportFilter !== 'all' && (
                        <button
                            onClick={() => onSportFilterChange('all')}
                            className="text-[10px] text-[#52525b] hover:text-[#a1a1aa] transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-1/3 space-y-3">
                <StatCard
                    icon={Activity}
                    title="All Time"
                    accent="bg-gradient-to-r from-[#FC4C02] to-[#ff7a3d]"
                    index={0}
                    stats={[
                        { label: label, value: allTime.count, format: formatCount },
                        { label: "Distance", value: allTime.distance, format: formatKm },
                        { label: "Time", value: allTime.moving_time, format: formatDur },
                        { label: "Elevation", value: allTime.elevation_gain, format: formatElev },
                    ]}
                />
                <StatCard
                    icon={Award}
                    title="Year to Date"
                    accent="bg-gradient-to-r from-blue-500 to-blue-400"
                    index={1}
                    stats={[
                        { label: label, value: ytd.count, format: formatCount },
                        { label: "Distance", value: ytd.distance, format: formatKm },
                        { label: "Time", value: ytd.moving_time, format: formatDur },
                        { label: "Elevation", value: ytd.elevation_gain, format: formatElev },
                    ]}
                />
                <StatCard
                    icon={Zap}
                    title="Recent (4 weeks)"
                    accent="bg-gradient-to-r from-emerald-500 to-emerald-400"
                    index={2}
                    stats={[
                        { label: label, value: recent.count, format: formatCount },
                        { label: "Distance", value: recent.distance, format: formatKm },
                        { label: "Time", value: recent.moving_time, format: formatDur },
                        { label: "Elevation", value: recent.elevation_gain, format: formatElev },
                    ]}
                />
            </div>
            <motion.div
                className="w-full lg:w-2/3"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
                <GoalService ytdDistance={ytd.distance} />
            </motion.div>
        </div>
            <PBStats activities={activities} />
        </div>
    )
}
