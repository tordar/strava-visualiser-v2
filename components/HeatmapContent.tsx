'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin } from 'lucide-react'
import { StravaActivity } from '@/types/strava'
import { decodePolyline } from '@/lib/polyline'
import { SpotlightCard } from './SpotlightCard'
import TimelineControls from './TimelineControls'

interface HeatmapContentProps {
    activities: StravaActivity[]
}

interface DecodedActivity {
    id: number
    name: string
    type: string
    date: string
    distance: number
    moving_time: number
    elevation: number
    positions: L.LatLngExpression[]
}

// --- Map helper components ---

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
    const map = useMap()
    useEffect(() => {
        if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
    }, [map, bounds])
    return null
}

function InvalidateSize({ trigger }: { trigger?: boolean }) {
    const map = useMap()
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 150)
        return () => clearTimeout(t)
    }, [map, trigger])
    return null
}

function FollowActivity({
    activity,
    enabled,
    speed,
    onUserInteraction,
    onFlyStart,
}: {
    activity: DecodedActivity | null
    enabled: boolean
    speed: number
    onUserInteraction: () => void
    onFlyStart: (starting: boolean) => void
}) {
    const map = useMap()
    const programmaticMove = useRef(false)

    useEffect(() => {
        const handleDrag = () => {
            if (!programmaticMove.current) onUserInteraction()
        }
        map.on('dragstart', handleDrag)
        return () => { map.off('dragstart', handleDrag) }
    }, [map, onUserInteraction])

    useEffect(() => {
        if (!enabled || !activity || activity.positions.length === 0) return
        const b = L.latLngBounds(activity.positions as L.LatLngTuple[])
        if (!b.isValid()) return

        // Skip if route is already visible AND map is zoomed in enough
        let needsFly = true
        try {
            const mapBounds = map.getBounds()
            const mapSpan = mapBounds.getNorthEast().lat - mapBounds.getSouthWest().lat
            if (mapSpan < 0.5 && mapBounds.contains(b)) needsFly = false
        } catch { /* map not ready */ }

        if (needsFly) {
            programmaticMove.current = true
            // Set a large dwell immediately so the animation loop waits
            onFlyStart(true)
            map.flyToBounds(b, { padding: [100, 100], maxZoom: 12, duration: 0.6 })
            const onEnd = () => {
                programmaticMove.current = false
                // Fly is done — NOW set the real dwell so the user can see the route
                onFlyStart(false)
            }
            map.once('moveend', onEnd)
            return () => { map.off('moveend', onEnd) }
        }
    }, [map, activity, enabled, speed, onFlyStart])

    return null
}

// --- Imperative polyline manager (bypasses React reconciliation) ---

function PolylineManager({
    activities,
    currentIndex,
}: {
    activities: DecodedActivity[]
    currentIndex: number
}) {
    const map = useMap()
    const rendererRef = useRef<L.Canvas | null>(null)
    const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup())
    const polylinesRef = useRef<L.Polyline[]>([])
    const prevIndexRef = useRef(-1)
    const highlightRef = useRef<L.Polyline | null>(null)

    // Single shared canvas renderer + layer group
    useEffect(() => {
        rendererRef.current = L.canvas({ padding: 0.5 })
        const lg = layerGroupRef.current
        lg.addTo(map)
        return () => { lg.clearLayers(); lg.remove() }
    }, [map])

    // Zoom-aware weight
    const getWeight = useCallback((base: number) => {
        const z = map.getZoom()
        if (z <= 6) return base * 2.5
        if (z <= 9) return base * 2
        if (z <= 12) return base * 1.5
        return base
    }, [map])

    // Update weights when zoom changes
    useEffect(() => {
        const handler = () => {
            const lines = polylinesRef.current
            const w = getWeight(2)
            const newestW = getWeight(3)
            for (let i = 0; i <= prevIndexRef.current; i++) {
                if (!lines[i]) continue
                const isNewest = i === prevIndexRef.current
                lines[i].setStyle({
                    weight: isNewest ? newestW : w,
                    color: isNewest ? '#00ffff' : '#FC4C02',
                })
            }
        }
        map.on('zoomend', handler)
        return () => { map.off('zoomend', handler) }
    }, [map, getWeight])

    useEffect(() => {
        const lg = layerGroupRef.current
        const lines = polylinesRef.current
        const prev = prevIndexRef.current

        // Going forward — just add new polylines
        if (currentIndex > prev) {
            // Fade the previous "newest" line back to the base orange
            if (prev >= 0 && lines[prev]) {
                lines[prev].setStyle({ color: '#FC4C02', weight: getWeight(2), opacity: 0.5 })
            }

            for (let i = prev + 1; i <= currentIndex && i < activities.length; i++) {
                const activity = activities[i]
                // New lines start in base orange (they'll get highlighted below if newest)
                const line = L.polyline(activity.positions, {
                    color: '#FC4C02',
                    weight: getWeight(2),
                    opacity: 0.5,
                    renderer: rendererRef.current!,
                })

                // Tooltip on hover
                line.on('mouseover', () => {
                    highlightRef.current = line
                    line.setStyle({ color: '#ffffff', weight: getWeight(3), opacity: 1 })
                    line.bringToFront()
                    const d = new Date(activity.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    line.bindTooltip(
                        `<strong>${activity.name}</strong><br/>${d} &middot; ${(activity.distance / 1000).toFixed(1)} km`,
                        { sticky: true, className: 'heatmap-tooltip' }
                    ).openTooltip()
                })
                line.on('mouseout', () => {
                    highlightRef.current = null
                    const isNewest = polylinesRef.current.indexOf(line) === prevIndexRef.current
                    line.setStyle({
                        color: isNewest ? '#00ffff' : '#FC4C02',
                        weight: getWeight(isNewest ? 3 : 2),
                        opacity: isNewest ? 1 : 0.5,
                    })
                    line.closeTooltip()
                    line.unbindTooltip()
                })

                line.addTo(lg)
                lines[i] = line
            }

            // Highlight the newest line in cyan so it pops against the orange base
            if (lines[currentIndex] && lines[currentIndex] !== highlightRef.current) {
                lines[currentIndex].setStyle({ color: '#00ffff', weight: getWeight(3), opacity: 1 })
                lines[currentIndex].bringToFront()
            }
        }

        // Going backward (slider scrub) — remove excess polylines
        if (currentIndex < prev) {
            for (let i = prev; i > currentIndex; i--) {
                if (lines[i]) {
                    lg.removeLayer(lines[i])
                    delete lines[i]
                }
            }
            // Highlight the new "newest"
            if (lines[currentIndex]) {
                lines[currentIndex].setStyle({ color: '#00ffff', weight: getWeight(3), opacity: 1 })
                lines[currentIndex].bringToFront()
            }
        }

        prevIndexRef.current = currentIndex
    }, [currentIndex, activities, getWeight])

    // Full reset: when activities array changes, clear everything
    useEffect(() => {
        const lg = layerGroupRef.current
        return () => {
            lg.clearLayers()
            polylinesRef.current = []
            prevIndexRef.current = -1
        }
    }, [activities])

    return null
}

// --- Main component ---

export default function HeatmapContent({ activities }: HeatmapContentProps) {
    const [currentIndex, setCurrentIndex] = useState(-1) // -1 = not initialized yet
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState(1)
    const [followMode, setFollowMode] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const dwellUntilRef = useRef(0)

    // Fullscreen toggle
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
    }, [])

    // Sync state with browser fullscreen changes (including Escape key)
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handler)
        return () => document.removeEventListener('fullscreenchange', handler)
    }, [])

    const decodedActivities = useMemo<DecodedActivity[]>(() => {
        return activities
            .filter(a => a.map?.summary_polyline)
            .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())
            .map(a => ({
                id: a.id,
                name: a.name,
                type: a.type,
                date: a.start_date_local,
                distance: a.distance,
                moving_time: a.moving_time,
                elevation: a.total_elevation_gain,
                positions: decodePolyline(a.map!.summary_polyline!) as L.LatLngExpression[],
            }))
    }, [activities])

    // When activities change (or sport filter), show all routes by default
    useEffect(() => {
        if (decodedActivities.length > 0) {
            setCurrentIndex(decodedActivities.length - 1)
            setIsPlaying(false)
        }
    }, [decodedActivities])

    // Smart bounds: find the densest cluster of start points for initial view
    const bounds = useMemo(() => {
        const starts = decodedActivities
            .map(a => a.positions[0] as [number, number] | undefined)
            .filter((p): p is [number, number] => !!p)
        if (starts.length === 0) return null

        // Use the median lat/lng as the center, then build bounds around
        // the middle 80% of points to ignore outlier trips
        const sortedLats = starts.map(p => p[0]).sort((a, b) => a - b)
        const sortedLngs = starts.map(p => p[1]).sort((a, b) => a - b)
        const trim = Math.floor(starts.length * 0.1)
        const coreLats = sortedLats.slice(trim, sortedLats.length - trim)
        const coreLngs = sortedLngs.slice(trim, sortedLngs.length - trim)

        if (coreLats.length === 0 || coreLngs.length === 0) {
            return L.latLngBounds(starts.map(p => L.latLng(p[0], p[1])))
        }

        return L.latLngBounds(
            L.latLng(coreLats[0], coreLngs[0]),
            L.latLng(coreLats[coreLats.length - 1], coreLngs[coreLngs.length - 1])
        )
    }, [decodedActivities])

    // Called by FollowActivity when the map flies to a new location
    const handleFlyStart = useCallback((starting: boolean) => {
        if (starting) {
            // Fly is beginning — block animation for the fly duration (~800ms max)
            dwellUntilRef.current = Date.now() + 900
        } else {
            // Fly finished — add dwell on top. 1x=1.2s, 2x=700ms, 4x=400ms, 8x=250ms
            const dwell = Math.max(250, 1200 / speed)
            dwellUntilRef.current = Date.now() + dwell
        }
    }, [speed])

    // Animation loop using chained timeouts for dynamic pacing
    useEffect(() => {
        if (!isPlaying) {
            if (intervalRef.current) clearTimeout(intervalRef.current)
            intervalRef.current = null
            return
        }

        const tick = () => {
            const baseDelay = Math.max(60, 500 / speed)
            // If we're dwelling (map just flew somewhere), wait longer
            const dwellRemaining = Math.max(0, dwellUntilRef.current - Date.now())
            const delay = dwellRemaining > 0 ? dwellRemaining : baseDelay

            intervalRef.current = setTimeout(() => {
                setCurrentIndex(prev => {
                    if (prev >= decodedActivities.length - 1) {
                        setIsPlaying(false)
                        return prev
                    }
                    return prev + 1
                })
                tick()
            }, delay)
        }
        tick()

        return () => { if (intervalRef.current) clearTimeout(intervalRef.current) }
    }, [isPlaying, speed, decodedActivities.length])

    const handleTogglePlay = useCallback(() => {
        if (currentIndex >= decodedActivities.length - 1) {
            setCurrentIndex(0)
            setIsPlaying(true)
        } else {
            setIsPlaying(p => !p)
        }
    }, [currentIndex, decodedActivities.length])

    const handleReset = useCallback(() => {
        setCurrentIndex(0)
        setIsPlaying(false)
        setFollowMode(true)
    }, [])

    const handleUserMapInteraction = useCallback(() => {
        setFollowMode(false)
    }, [])

    const handleSliderChange = useCallback((index: number) => {
        setCurrentIndex(index)
        setIsPlaying(false)
    }, [])

    if (decodedActivities.length === 0) {
        return (
            <div className="rounded-xl bg-[#16161d] border border-white/[0.06] h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                    <MapPin className="h-8 w-8 text-[#3f3f46] mx-auto" />
                    <p className="text-[#52525b] text-sm">No GPS routes available</p>
                    <p className="text-[#3f3f46] text-xs">Activities with GPS tracking will appear here</p>
                </div>
            </div>
        )
    }

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`${isFullscreen ? 'h-screen' : 'h-full'}`}
            style={isFullscreen ? { background: '#0c0c10' } : undefined}
        >
            <SpotlightCard className={`rounded-xl bg-[#16161d] border border-white/[0.06] overflow-hidden h-full flex flex-col ${isFullscreen ? '' : 'card-glow'}`} spotlightSize={350}>
                {!isFullscreen && <div className="h-0.5 w-full bg-gradient-to-r from-[#FC4C02] to-amber-400" />}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-sm font-semibold text-white">Route Heatmap</h2>
                        <p className="text-xs text-[#52525b] mt-0.5">{decodedActivities.length} routes</p>
                    </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                    <MapContainer
                        center={[0, 0]}
                        zoom={2}
                        className="h-full w-full"
                        zoomControl={true}
                        attributionControl={true}
                        style={{ background: '#0c0c10' }}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        <FitBounds bounds={bounds} />
                        <InvalidateSize trigger={isFullscreen} />
                        <FollowActivity
                            activity={decodedActivities[currentIndex] ?? null}
                            enabled={followMode && isPlaying}
                            speed={speed}
                            onUserInteraction={handleUserMapInteraction}
                            onFlyStart={handleFlyStart}
                        />
                        <PolylineManager
                            activities={decodedActivities}
                            currentIndex={currentIndex}
                        />
                    </MapContainer>
                    <ActivityInfoPanel activity={decodedActivities[currentIndex]} index={currentIndex} total={decodedActivities.length} />
                </div>
                <TimelineControls
                    currentIndex={currentIndex}
                    total={decodedActivities.length}
                    isPlaying={isPlaying}
                    speed={speed}
                    followMode={followMode}
                    currentDate={decodedActivities[currentIndex]?.date}
                    onTogglePlay={handleTogglePlay}
                    onSpeedChange={setSpeed}
                    onSliderChange={handleSliderChange}
                    onReset={handleReset}
                    onToggleFollow={() => setFollowMode(f => !f)}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                />
            </SpotlightCard>
        </motion.div>
    )
}

// --- Activity info overlay ---

function ActivityInfoPanel({ activity, index, total }: { activity: DecodedActivity | undefined; index: number; total: number }) {
    if (!activity) return null

    const km = (activity.distance / 1000).toFixed(2)
    const hours = Math.floor(activity.moving_time / 3600)
    const mins = Math.floor((activity.moving_time % 3600) / 60)
    const secs = activity.moving_time % 60
    const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`

    // Pace: min/km
    const totalMins = activity.moving_time / 60
    const distKm = activity.distance / 1000
    const paceTotal = distKm > 0 ? totalMins / distKm : 0
    const paceMin = Math.floor(paceTotal)
    const paceSec = Math.round((paceTotal - paceMin) * 60)
    const pace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`

    const date = new Date(activity.date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    })

    return (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-[1000] pointer-events-none max-w-[calc(100%-1rem)] sm:max-w-none">
            <div className="bg-[#16161d]/90 backdrop-blur-md border border-white/[0.08] rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-2xl space-y-1.5 sm:space-y-2 pointer-events-auto">
                {/* Activity name + type */}
                <div>
                    <p className="text-white text-xs sm:text-sm font-semibold leading-tight truncate max-w-[180px] sm:max-w-[220px]">{activity.name}</p>
                    <p className="text-[#52525b] text-[10px] mt-0.5">{activity.type} &middot; {date}</p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1">
                    <div>
                        <p className="text-[#52525b] text-[9px] sm:text-[10px] uppercase tracking-wide">Distance</p>
                        <p className="text-white text-xs sm:text-sm font-bold tabular-nums">{km} km</p>
                    </div>
                    <div>
                        <p className="text-[#52525b] text-[9px] sm:text-[10px] uppercase tracking-wide">Duration</p>
                        <p className="text-white text-xs sm:text-sm font-bold tabular-nums">{duration}</p>
                    </div>
                    <div>
                        <p className="text-[#52525b] text-[9px] sm:text-[10px] uppercase tracking-wide">Pace</p>
                        <p className="text-white text-xs sm:text-sm font-bold tabular-nums">{pace} /km</p>
                    </div>
                    <div>
                        <p className="text-[#52525b] text-[9px] sm:text-[10px] uppercase tracking-wide">Elevation</p>
                        <p className="text-white text-xs sm:text-sm font-bold tabular-nums">{Math.round(activity.elevation)} m</p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="pt-0.5">
                    <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#FC4C02] rounded-full transition-all duration-300"
                            style={{ width: `${((index + 1) / total) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
