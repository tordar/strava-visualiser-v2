'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import ChartComponent from "@/components/StravaChart"
import { Stats } from "@/components/Stats"
import { AthleteAvatar } from "@/components/AthleteAvatar"
import YearlyProgressChart from "@/components/YearlyProgressChart"
import HeatmapTab from "@/components/HeatmapTab"
import ActivitiesTable from "@/components/ActivitiesTable"
import { RefreshCw, Menu } from 'lucide-react'
import { AuroraBlobs } from './AuroraBlobs'
import { StravaActivity } from '@/types/strava'

const TABS = [
    { key: 'stats', label: 'Stats' },
    { key: 'activities', label: 'Activities' },
    { key: 'chart', label: 'Chart' },
    { key: 'yearly', label: 'Yearly' },
    { key: 'heatmap', label: 'Heatmap' },
] as const

type TabKey = typeof TABS[number]['key']

const CACHE_KEY = 'strava_dashboard_v3' // bumped to include best_efforts PB data
const REVALIDATE_AFTER = 5 * 60 * 1000 // re-fetch in background if older than 5 min

interface AthleteStats {
    recent_run_totals: { count: number; distance: number; moving_time: number; elevation_gain: number }
    ytd_run_totals:    { count: number; distance: number; moving_time: number; elevation_gain: number }
    all_run_totals:    { count: number; distance: number; moving_time: number; elevation_gain: number }
}

interface Athlete {
    id: number
    username: string
    firstname: string
    lastname: string
    city: string
    profile: string
}

interface DashboardData {
    athlete: Athlete
    athleteStats: AthleteStats
    chartActivities: StravaActivity[]
}

interface CacheEntry {
    data: DashboardData
    cachedAt: number
}

function readCache(): CacheEntry | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as CacheEntry
    } catch {
        return null
    }
}

function writeCache(data: DashboardData) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }))
    } catch {
        // localStorage quota exceeded or unavailable — ignore
    }
}

function clearCache() {
    try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}

function timeAgo(ms: number): string {
    const s = Math.floor((Date.now() - ms) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    return `${Math.floor(s / 3600)}h ago`
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
}

function formatDistance(distance: number): string {
    const km = distance / 1000
    return `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(km)} km`
}

const StravaLogo = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FC4C02]" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
)

export default function StravaData() {
    const [data, setData]           = useState<DashboardData | null>(null)
    const [loading, setLoading]     = useState(true)   // true only on first load with no cache
    const [refreshing, setRefreshing] = useState(false) // background / manual refresh
    const [cachedAt, setCachedAt]   = useState<number | null>(null)
    const [error, setError]         = useState<string | null>(null)
    const [activeTab, setActiveTab]  = useState<TabKey>('stats')
    const [sportFilter, setSportFilter] = useState<string>('all')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const router = useRouter()
    const fetchFromAPI = useCallback(async (): Promise<DashboardData> => {
        const response = await fetch('/api/strava/dashboard')
        if (!response.ok) throw new Error('Failed to fetch dashboard data')
        const json = await response.json()
        return {
            athlete: json.athlete,
            athleteStats: json.athleteStats,
            chartActivities: json.activities,
        }
    }, [])

    const refresh = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true)
        setError(null)
        try {
            const fresh = await fetchFromAPI()
            writeCache(fresh)
            setData(fresh)
            setCachedAt(Date.now())
        } catch (err) {
            console.error('Fetch error:', err)
            setError('Failed to refresh. Please try again.')
        } finally {
            setRefreshing(false)
        }
    }, [fetchFromAPI])

    // On mount: load cache immediately, then revalidate if stale
    useEffect(() => {
        const cached = readCache()
        if (cached) {
            setData(cached.data)
            setCachedAt(cached.cachedAt)
            setLoading(false)
            const isStale = Date.now() - cached.cachedAt > REVALIDATE_AFTER
            if (isStale) refresh()
        } else {
            // No cache — full load
            fetchFromAPI()
                .then(fresh => {
                    writeCache(fresh)
                    setData(fresh)
                    setCachedAt(Date.now())
                })
                .catch(err => {
                    console.error('Fetch error:', err)
                    setError('Failed to load data. Please try again.')
                })
                .finally(() => {
                    setLoading(false)
                })
        }
    }, [fetchFromAPI, refresh])

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/strava/auth/logout', { method: 'POST' })
            if (response.ok) {
                clearCache()
                setData(null)
                router.push('/')
            }
        } catch {
            setError('Logout failed. Please try again.')
        }
    }

    const sportTypes = useMemo(() =>
        data ? Array.from(new Set(data.chartActivities.map(a => a.type))).sort() : []
    , [data])

    const filteredActivities = useMemo(() => {
        if (!data) return []
        if (sportFilter === 'all') return data.chartActivities
        return data.chartActivities.filter(a => a.type === sportFilter)
    }, [data, sportFilter])

    const sportCounts = useMemo(() => {
        if (!data) return {} as Record<string, number>
        const counts: Record<string, number> = {}
        for (const a of data.chartActivities) counts[a.type] = (counts[a.type] || 0) + 1
        return counts
    }, [data])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0c0c10]">
                <header className="border-b border-white/[0.06] px-4 sm:px-6">
                    <div className="max-w-7xl mx-auto flex items-center justify-between h-12 sm:h-14">
                        <div className="flex items-center gap-2">
                            <StravaLogo />
                            <span className="text-sm sm:text-base font-semibold tracking-tight text-white hidden sm:block">Strava Visualiser</span>
                        </div>
                        <div className="h-7 w-48 rounded-lg bg-white/[0.04] animate-pulse" />
                        <div className="h-8 w-8 rounded-full bg-white/[0.06] animate-pulse" />
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                    <div className="flex flex-col lg:flex-row gap-5">
                        <div className="w-full lg:w-1/3 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-xl bg-[#16161d] border border-white/[0.06] h-36 animate-pulse" />
                            ))}
                        </div>
                        <div className="w-full lg:w-2/3 rounded-xl bg-[#16161d] border border-white/[0.06] h-80 animate-pulse" />
                    </div>
                </main>
            </div>
        )
    }

    if (error && !data) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-[#0c0c10] gap-3">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                    onClick={() => refresh(true)}
                    className="text-xs text-[#71717a] hover:text-white transition-colors cursor-pointer"
                >
                    Try again
                </button>
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="min-h-screen bg-[#0c0c10] text-white dot-pattern">
            <AuroraBlobs />
            <header className="border-b border-white/[0.06] px-4 sm:px-6 backdrop-blur-md bg-[#0c0c10]/80 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto flex items-center justify-between h-12 sm:h-14">
                    {/* Logo — always show full title */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <StravaLogo />
                        <h1 className="text-sm sm:text-base font-semibold tracking-tight">Strava Visualiser</h1>
                    </div>

                    {/* Desktop tab nav */}
                    <nav className="hidden md:flex items-center relative mx-6">
                        <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5 gap-0.5 relative">
                            {TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`relative z-10 px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                                        activeTab === tab.key ? 'text-white' : 'text-[#52525b] hover:text-[#a1a1aa]'
                                    }`}
                                >
                                    {activeTab === tab.key && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white/[0.08] rounded-md"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Desktop right controls */}
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                        {cachedAt && (
                            <span className="text-[10px] text-[#3f3f46] hidden lg:inline">
                                {timeAgo(cachedAt)}
                            </span>
                        )}
                        <button
                            onClick={() => refresh(true)}
                            disabled={refreshing}
                            className="flex items-center justify-center w-8 h-8 text-[#52525b] hover:text-white transition-colors disabled:opacity-40 cursor-pointer rounded-lg hover:bg-white/[0.04]"
                            title="Refresh data"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <AthleteAvatar athlete={data.athlete} onLogout={handleLogout} />
                    </div>

                    {/* Mobile: menu toggle on the right */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer"
                    >
                        <Menu className="h-4 w-4 text-[#a1a1aa]" />
                    </button>
                </div>
            </header>

            {/* Mobile sheet */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/60 z-40 md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#16161d] border-t border-white/[0.08] rounded-t-2xl"
                        >
                            <div className="p-5 space-y-4">
                                {/* Handle bar */}
                                <div className="w-10 h-1 bg-white/[0.12] rounded-full mx-auto" />

                                {/* Profile + sync */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={data.athlete.profile}
                                            alt={`${data.athlete.firstname} ${data.athlete.lastname}`}
                                            className="w-9 h-9 rounded-full"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{data.athlete.firstname} {data.athlete.lastname}</p>
                                            {cachedAt && <p className="text-[10px] text-[#52525b]">Updated {timeAgo(cachedAt)}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { refresh(true); setMobileMenuOpen(false) }}
                                        disabled={refreshing}
                                        className="flex items-center justify-center w-9 h-9 rounded-lg text-[#52525b] hover:text-white hover:bg-white/[0.06] disabled:opacity-40 cursor-pointer"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {/* Nav items */}
                                <div className="space-y-1">
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => { setActiveTab(tab.key); setMobileMenuOpen(false) }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                                                activeTab === tab.key
                                                    ? 'bg-[#FC4C02]/10 text-[#FC4C02]'
                                                    : 'text-[#a1a1aa] hover:bg-white/[0.04] hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Sport filter */}
                                {sportTypes.length > 1 && (
                                    <div className="pt-2 border-t border-white/[0.06] space-y-2">
                                        <span className="text-xs text-[#52525b]">Favourite sport</span>
                                        <select
                                            value={sportFilter}
                                            onChange={e => { setSportFilter(e.target.value); setMobileMenuOpen(false) }}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#FC4C02]/30 cursor-pointer appearance-none"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
                                        >
                                            <option value="all">All sports</option>
                                            {sportTypes.map(type => (
                                                <option key={type} value={type}>{type} ({sportCounts[type] || 0})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Sign out */}
                                <button
                                    onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm text-[#52525b] hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                                >
                                    Sign out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <main className="max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-6 relative z-10">
                {activeTab === 'stats' && (
                    <Stats
                        activities={data.chartActivities}
                        sportFilter={sportFilter}
                        sportTypes={sportTypes}
                        sportCounts={sportCounts}
                        onSportFilterChange={setSportFilter}
                    />
                )}
                {activeTab === 'activities' && (
                    <div className="h-[calc(100vh-3rem)] sm:h-[calc(100vh-8rem)]">
                        <ActivitiesTable activities={filteredActivities} />
                    </div>
                )}
                {activeTab === 'chart' && (
                    <div className="h-[calc(100vh-3rem)] sm:h-[calc(100vh-8rem)]">
                        <ChartComponent activities={filteredActivities} />
                    </div>
                )}
                {activeTab === 'yearly' && (
                    <div className="h-[calc(100vh-3rem)] sm:h-[calc(100vh-8rem)]">
                        <YearlyProgressChart activities={filteredActivities} />
                    </div>
                )}
                {activeTab === 'heatmap' && (
                    <div className="h-[calc(100vh-3rem)] sm:h-[calc(100vh-8rem)]">
                        <HeatmapTab activities={filteredActivities} />
                    </div>
                )}
            </main>
        </div>
    )
}
