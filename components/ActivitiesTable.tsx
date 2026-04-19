'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown, Search, Trophy, ChevronsUpDown } from 'lucide-react'
import { StravaActivity } from '@/types/strava'
import { SpotlightCard } from './SpotlightCard'
import { activityElevation } from '@/lib/utils'

interface ActivitiesTableProps {
    activities: StravaActivity[]
}

type SortKey = 'date' | 'name' | 'type' | 'distance' | 'moving_time' | 'pace' | 'elevation'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

function formatPace(seconds: number, meters: number): string {
    if (meters === 0) return '—'
    const pace = seconds / (meters / 1000)
    const m = Math.floor(pace / 60)
    const s = Math.round(pace % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function ActivitiesTable({ activities }: ActivitiesTableProps) {
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('date')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [page, setPage] = useState(1)

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('desc')
        }
        setPage(1)
    }

    const filtered = useMemo(() => {
        if (!search) return activities
        const q = search.toLowerCase()
        return activities.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.type.toLowerCase().includes(q) ||
            formatDate(a.start_date_local).toLowerCase().includes(q)
        )
    }, [activities, search])

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let cmp = 0
            switch (sortKey) {
                case 'date':
                    cmp = new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
                    break
                case 'name':
                    cmp = a.name.localeCompare(b.name)
                    break
                case 'type':
                    cmp = a.type.localeCompare(b.type)
                    break
                case 'distance':
                    cmp = a.distance - b.distance
                    break
                case 'moving_time':
                    cmp = a.moving_time - b.moving_time
                    break
                case 'pace':
                    cmp = (a.distance > 0 ? a.moving_time / a.distance : 0) - (b.distance > 0 ? b.moving_time / b.distance : 0)
                    break
                case 'elevation':
                    cmp = activityElevation(a) - activityElevation(b)
                    break
            }
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [filtered, sortKey, sortDir])

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
    const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />
        return sortDir === 'asc'
            ? <ChevronUp className="h-3 w-3 text-[#FC4C02]" />
            : <ChevronDown className="h-3 w-3 text-[#FC4C02]" />
    }

    const columns: { key: SortKey; label: string; className: string; hideOnMobile?: boolean }[] = [
        { key: 'date', label: 'Date', className: 'w-[110px] sm:w-[130px]' },
        { key: 'name', label: 'Name', className: 'min-w-[140px]' },
        { key: 'type', label: 'Type', className: 'w-[80px]', hideOnMobile: true },
        { key: 'distance', label: 'Distance', className: 'w-[90px] text-right' },
        { key: 'moving_time', label: 'Duration', className: 'w-[90px] text-right', hideOnMobile: true },
        { key: 'pace', label: 'Pace', className: 'w-[80px] text-right', hideOnMobile: true },
        { key: 'elevation', label: 'Elev.', className: 'w-[70px] text-right', hideOnMobile: true },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
        >
        <SpotlightCard className="rounded-xl bg-[#16161d] border border-white/[0.06] overflow-hidden h-full flex flex-col card-glow mobile-flush" spotlightSize={350}>
            <div className="h-0.5 w-full bg-gradient-to-r from-[#FC4C02] to-amber-400" />

            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] flex items-center justify-between gap-3 flex-shrink-0">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-white">Activities</h2>
                    <p className="text-xs text-[#52525b] mt-0.5">{filtered.length} activities</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#52525b]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Search..."
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#3f3f46] outline-none focus:border-[#FC4C02]/30 w-40 sm:w-56 transition-colors"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-[#16161d]">
                        <tr className="border-b border-white/[0.06]">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    onClick={() => handleSort(col.key)}
                                    className={`px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-medium text-[#52525b] uppercase tracking-wider cursor-pointer hover:text-[#a1a1aa] transition-colors select-none ${col.className} ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.label}
                                        <SortIcon col={col.key} />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map(activity => (
                            <tr
                                key={activity.id}
                                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                            >
                                <td className="px-3 sm:px-4 py-2.5 text-[#a1a1aa] tabular-nums whitespace-nowrap">
                                    <span className="hidden sm:inline">{formatDate(activity.start_date_local)}</span>
                                    <span className="sm:hidden">{formatDateShort(activity.start_date_local)}</span>
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-white font-medium truncate max-w-[200px]">
                                    <span className="inline-flex items-center gap-1.5">
                                        {activity.workout_type === 1 && <Trophy className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                                        {activity.name}
                                    </span>
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-[#71717a] hidden sm:table-cell">{activity.type}</td>
                                <td className="px-3 sm:px-4 py-2.5 text-white tabular-nums text-right font-medium">{(activity.distance / 1000).toFixed(2)} km</td>
                                <td className="px-3 sm:px-4 py-2.5 text-[#a1a1aa] tabular-nums text-right hidden sm:table-cell">{formatDuration(activity.moving_time)}</td>
                                <td className="px-3 sm:px-4 py-2.5 text-[#a1a1aa] tabular-nums text-right hidden sm:table-cell">{formatPace(activity.moving_time, activity.distance)} /km</td>
                                <td className="px-3 sm:px-4 py-2.5 text-[#a1a1aa] tabular-nums text-right hidden sm:table-cell">{Math.round(activityElevation(activity))} m</td>
                            </tr>
                        ))}
                        {paged.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-[#3f3f46] text-sm">
                                    No activities found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-4 sm:px-6 py-3 border-t border-white/[0.06] flex items-center justify-between flex-shrink-0">
                    <p className="text-[10px] sm:text-xs text-[#3f3f46]">
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-2.5 py-1 text-xs rounded-md text-[#71717a] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            Prev
                        </button>
                        <span className="text-xs text-[#52525b] tabular-nums px-2">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-2.5 py-1 text-xs rounded-md text-[#71717a] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </SpotlightCard>
        </motion.div>
    )
}
