# Year Filter & Personal Bests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a year filter to the activity chart (showing all 365/366 days including empty ones) and integrate Strava best efforts to display top-3 PBs with chart markers and a stats progression section.

**Architecture:** The dashboard API route is extended to fetch activity details for PR activities, adding `best_efforts` data to the activity objects. The chart component gets a year dropdown that switches between all-time (current behavior) and per-year views with full calendar days. A new `PBStats` component renders per-distance cards with expandable progression mini-charts. PB markers are added to the chart as a new scatter layer.

**Tech Stack:** Next.js 15, React 19, Recharts, Framer Motion, Tailwind CSS, Strava API v3, lucide-react icons

---

## File Structure

| File | Responsibility |
|------|---------------|
| `types/strava.ts` | Type definitions for `BestEffort` and extended `StravaActivity` |
| `app/api/strava/dashboard/route.ts` | Server-side Strava API fetching, including detail calls for PR activities |
| `components/StravaData.tsx` | Client orchestrator, cache management, data flow to tabs |
| `components/StravaChart.tsx` | Activity chart with year filter, PB scatter markers, PB popup |
| `components/PBStats.tsx` | PB stats cards with progression mini-charts (new file) |
| `components/Stats.tsx` | Stats tab layout, renders PBStats below goal service |

---

### Task 1: Extend Types

**Files:**
- Modify: `types/strava.ts`

- [ ] **Step 1: Add BestEffort interface and extend StravaActivity**

Replace the entire contents of `types/strava.ts` with:

```typescript
export interface BestEffort {
    id: number
    name: string           // "1K", "5K", "10K", "Half-Marathon", "Marathon", "50K"
    elapsed_time: number
    moving_time: number
    distance: number       // in meters
    start_date_local: string
    pr_rank: number | null // 1, 2, or 3 if top-3 all-time; null otherwise
}

export interface StravaActivity {
    id: number
    name: string
    type: string
    distance: number
    moving_time: number
    total_elevation_gain: number
    start_date_local: string
    start_latlng: [number, number] | null
    workout_type?: number | null
    map?: {
        id: string
        summary_polyline: string | null
        resource_state: number
    }
    pr_count?: number
    best_efforts?: BestEffort[]
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `cd /Users/tordartommervik/Documents/code/shadcn-strava-visualiser && npx next build 2>&1 | tail -20`

Expected: Build succeeds (existing code already uses `StravaActivity` from this file).

- [ ] **Step 3: Commit**

```bash
git add types/strava.ts
git commit -m "feat: add BestEffort type and pr_count/best_efforts to StravaActivity"
```

---

### Task 2: Fetch Best Efforts in Dashboard API

**Files:**
- Modify: `app/api/strava/dashboard/route.ts`

- [ ] **Step 1: Add detail fetching for PR activities**

The current `GET` handler fetches all activities from the list endpoint, then fetches athlete stats. After fetching all activities (line 79 in current code, right before `const athleteStats = ...`), add logic to:

1. Filter activities where `pr_count > 0`
2. Batch-fetch their details (5 concurrent) via `GET /activities/{id}`
3. Extract `best_efforts` from each detail response and merge into the activity object

Replace the entire `GET` function body (inside the `try` block, after `let activities = [...page1]` and the pagination loop, replacing from `const athleteStats` to the `return`):

```typescript
        // Fetch details for activities with PRs to get best_efforts
        const prActivities = activities.filter((a: { pr_count?: number }) => a.pr_count && a.pr_count > 0)
        const prDetailsMap = new Map<number, { best_efforts: unknown[] }>()

        // Batch detail fetches in groups of 5
        for (let i = 0; i < prActivities.length; i += 5) {
            const batch = prActivities.slice(i, i + 5)
            const details = await Promise.all(
                batch.map((a: { id: number }) =>
                    stravaGet(accessToken, `activities/${a.id}`).catch(() => null)
                )
            )
            for (const detail of details) {
                if (detail?.id && detail.best_efforts) {
                    prDetailsMap.set(detail.id, { best_efforts: detail.best_efforts })
                }
            }
        }

        // Merge best_efforts into activities
        const enrichedActivities = activities.map((a: { id: number; pr_count?: number }) => {
            const detail = prDetailsMap.get(a.id)
            if (detail) {
                return { ...a, best_efforts: detail.best_efforts }
            }
            return a
        })

        const athleteStats = await stravaGet(accessToken, `athletes/${athlete.id}/stats`)
        return NextResponse.json({ athlete, athleteStats, activities: enrichedActivities })
```

- [ ] **Step 2: Test manually**

Clear the browser localStorage (`strava_dashboard_v2`), reload the app, and check the Network tab. Verify:
- The `/api/strava/dashboard` response includes `best_efforts` arrays on some activities
- Activities without PRs have no `best_efforts` field

- [ ] **Step 3: Commit**

```bash
git add app/api/strava/dashboard/route.ts
git commit -m "feat: fetch best_efforts for PR activities in dashboard API"
```

---

### Task 3: Update Client Cache and Remove Duplicate Types

**Files:**
- Modify: `components/StravaData.tsx`

- [ ] **Step 1: Remove duplicate StravaActivity interface and import from types**

In `components/StravaData.tsx`, add this import at the top (after the existing imports, around line 11):

```typescript
import { StravaActivity } from '@/types/strava'
```

Then delete the local `StravaActivity` interface (lines 28-43):

```typescript
// DELETE THIS ENTIRE BLOCK:
interface StravaActivity {
    id: number
    name: string
    type: string
    distance: number
    moving_time: number
    total_elevation_gain: number
    start_date_local: string
    start_latlng: [number, number] | null
    workout_type?: number | null
    map?: {
        id: string
        summary_polyline: string | null
        resource_state: number
    }
}
```

- [ ] **Step 2: Bump the cache key**

Change the `CACHE_KEY` constant (line 25) from:

```typescript
const CACHE_KEY = 'strava_dashboard_v2' // bumped to invalidate old 1000-activity cache
```

to:

```typescript
const CACHE_KEY = 'strava_dashboard_v3' // bumped to include best_efforts PB data
```

- [ ] **Step 3: Verify the project compiles**

Run: `cd /Users/tordartommervik/Documents/code/shadcn-strava-visualiser && npx next build 2>&1 | tail -20`

Expected: Build succeeds. The `StravaActivity` type from `types/strava.ts` is a superset of the old local one, so all existing usage works.

- [ ] **Step 4: Commit**

```bash
git add components/StravaData.tsx
git commit -m "refactor: use shared StravaActivity type, bump cache key to v3"
```

---

### Task 4: Chart Year Filter

**Files:**
- Modify: `components/StravaChart.tsx`

- [ ] **Step 1: Add year state and compute available years**

In the `ChartComponent` function (after the existing state declarations on lines 141-143), add:

```typescript
const [selectedYear, setSelectedYear] = React.useState<number | null>(null)

const availableYears = React.useMemo(() => {
    if (!activities || activities.length === 0) return []
    const years = new Set(activities.map(a => new Date(a.start_date_local).getFullYear()))
    return Array.from(years).sort((a, b) => b - a) // newest first
}, [activities])
```

- [ ] **Step 2: Modify chartData memo to support year view**

Replace the existing `chartData` memo (lines 145-166) with:

```typescript
const chartData = React.useMemo<ChartEntry[]>(() => {
    if (!activities || activities.length === 0) return []

    const sorted = [...activities]
        .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())

    if (selectedYear === null) {
        // All-time view: current behavior
        return sorted.map(activity => {
            const isRace = activity.workout_type === 1
            const dist = parseFloat((activity.distance / 1000).toFixed(2))
            return {
                date: new Date(activity.start_date_local).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
                fullDate: new Date(activity.start_date_local).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
                name: activity.name,
                distance: dist,
                movingTime: activity.moving_time,
                elevation: activity.total_elevation_gain,
                isRace,
                raceDistance: isRace ? dist : null,
                polyline: isRace && activity.map?.summary_polyline
                    ? decodePolyline(activity.map.summary_polyline)
                    : null,
            }
        })
    }

    // Year view: one entry per calendar day
    const isLeap = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0
    const daysInYear = isLeap ? 366 : 365

    // Group activities by day-of-year
    const yearActivities = sorted.filter(a => new Date(a.start_date_local).getFullYear() === selectedYear)
    const dayMap = new Map<string, typeof yearActivities>()
    for (const a of yearActivities) {
        const dateKey = a.start_date_local.slice(0, 10) // "YYYY-MM-DD"
        if (!dayMap.has(dateKey)) dayMap.set(dateKey, [])
        dayMap.get(dateKey)!.push(a)
    }

    const entries: ChartEntry[] = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for (let d = 0; d < daysInYear; d++) {
        const date = new Date(selectedYear, 0, 1 + d)
        const dateKey = date.toISOString().slice(0, 10)
        const dayActivities = dayMap.get(dateKey)
        const isFirstOfMonth = date.getDate() === 1
        const label = isFirstOfMonth ? monthNames[date.getMonth()] : ''

        if (dayActivities && dayActivities.length > 0) {
            const totalDist = dayActivities.reduce((sum, a) => sum + a.distance / 1000, 0)
            const totalTime = dayActivities.reduce((sum, a) => sum + a.moving_time, 0)
            const totalElev = dayActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0)
            const hasRace = dayActivities.some(a => a.workout_type === 1)
            const raceActivity = dayActivities.find(a => a.workout_type === 1)
            entries.push({
                date: label,
                fullDate: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
                name: dayActivities.length === 1 ? dayActivities[0].name : `${dayActivities.length} activities`,
                distance: parseFloat(totalDist.toFixed(2)),
                movingTime: totalTime,
                elevation: totalElev,
                isRace: hasRace,
                raceDistance: hasRace ? parseFloat(totalDist.toFixed(2)) : null,
                polyline: raceActivity?.map?.summary_polyline
                    ? decodePolyline(raceActivity.map.summary_polyline)
                    : null,
            })
        } else {
            entries.push({
                date: label,
                fullDate: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
                name: '',
                distance: 0,
                movingTime: 0,
                elevation: 0,
                isRace: false,
                raceDistance: null,
                polyline: null,
            })
        }
    }
    return entries
}, [activities, selectedYear])
```

- [ ] **Step 3: Add year dropdown to the chart header**

In the header bar JSX (inside the `<div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">` on line 195), add the year dropdown **before** the total distance block:

```tsx
<select
    value={selectedYear ?? ''}
    onChange={e => setSelectedYear(e.target.value === '' ? null : Number(e.target.value))}
    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FC4C02]/30 cursor-pointer appearance-none"
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px' }}
>
    <option value="">All time</option>
    {availableYears.map(y => (
        <option key={y} value={y}>{y}</option>
    ))}
</select>
```

- [ ] **Step 4: Adjust X-axis for year view**

Replace the `<XAxis>` component (lines 228-237) with a version that adapts to the selected view:

```tsx
<XAxis
    dataKey="date"
    stroke="transparent"
    tick={{ fill: '#52525b', fontSize: 10 }}
    tickLine={false}
    axisLine={false}
    interval={selectedYear !== null ? undefined : Math.max(0, Math.floor(chartData.length / 8) - 1)}
    angle={selectedYear !== null ? 0 : -35}
    textAnchor={selectedYear !== null ? 'middle' : 'end'}
    height={selectedYear !== null ? 30 : 50}
    tickFormatter={selectedYear !== null ? (value: string) => value : undefined}
/>
```

- [ ] **Step 5: Suppress tooltip for empty days**

In the `CustomTooltip` function (line 126-137), add an early return for empty days:

Replace:
```typescript
if (!active || !payload?.length) return null
const entry = payload[0]?.payload as ChartEntry | undefined
if (!entry || entry.isRace) return null // races handled by RacePopup
```

With:
```typescript
if (!active || !payload?.length) return null
const entry = payload[0]?.payload as ChartEntry | undefined
if (!entry || entry.isRace) return null // races handled by RacePopup
if (entry.distance === 0) return null   // empty days in year view
```

- [ ] **Step 6: Test in browser**

Reload the app, go to the Chart tab. Verify:
- The year dropdown appears in the header
- Selecting a year shows all 365 days with month labels
- Empty days have no bars and no tooltip
- "All time" reverts to the original behavior
- Total distance updates for the selected year

- [ ] **Step 7: Commit**

```bash
git add components/StravaChart.tsx
git commit -m "feat: add year filter to chart with full calendar day view"
```

---

### Task 5: PB Toggle and Scatter Markers on Chart

**Files:**
- Modify: `components/StravaChart.tsx`

- [ ] **Step 1: Add PB imports and types**

At the top of `StravaChart.tsx`, add `Medal` to the lucide-react import:

```typescript
import { Trophy, Medal } from 'lucide-react'
```

Add this interface after the existing `ChartEntry` interface:

```typescript
interface PBMarker {
    distanceName: string   // "5K", "Half-Marathon", etc.
    displayName: string    // "5K", "Half Marathon", etc.
    prRank: number         // 1, 2, or 3
    movingTime: number
    effortDistance: number  // in meters
    activityName: string
    fullDate: string
    polyline: [number, number][] | null
}
```

Add this constant after the interfaces:

```typescript
const PB_DISTANCES = ['1K', '5K', '10K', 'Half-Marathon', 'Marathon', '50K'] as const
const PB_DISPLAY_NAMES: Record<string, string> = {
    '1K': '1K',
    '5K': '5K',
    '10K': '10K',
    'Half-Marathon': 'Half Marathon',
    'Marathon': 'Marathon',
    '50K': '50K',
}
const PB_RANK_COLORS: Record<number, { fill: string; stroke: string; glow: string }> = {
    1: { fill: '#fbbf24', stroke: '#fcd34d', glow: 'rgba(251,191,36,0.15)' },  // gold
    2: { fill: '#9ca3af', stroke: '#d1d5db', glow: 'rgba(156,163,175,0.15)' },  // silver
    3: { fill: '#d97706', stroke: '#f59e0b', glow: 'rgba(217,119,6,0.15)' },    // bronze
}
```

- [ ] **Step 2: Add PB-enriched ChartEntry field and state**

Add a new optional field to the `ChartEntry` interface:

```typescript
interface ChartEntry {
    date: string
    fullDate: string
    name: string
    distance: number
    movingTime: number
    elevation: number
    isRace: boolean
    raceDistance: number | null
    polyline: [number, number][] | null
    pbMarkers?: PBMarker[]       // NEW
    pbDistance?: number | null    // NEW — for scatter dataKey
}
```

In the `ChartComponent` function, add state for PB toggle (after the `showRaces` state):

```typescript
const [showPBs, setShowPBs] = React.useState(true)
const [hoveredPB, setHoveredPB] = React.useState<{ marker: PBMarker; x: number; y: number } | null>(null)
```

- [ ] **Step 3: Enrich chartData with PB markers**

After the `chartData` memo, add a new memo that enriches chart entries with PB data:

```typescript
const chartDataWithPBs = React.useMemo(() => {
    // Build a lookup: activity date -> PB markers
    const pbByDate = new Map<string, PBMarker[]>()

    for (const activity of activities) {
        if (!activity.best_efforts) continue
        for (const effort of activity.best_efforts) {
            if (!PB_DISTANCES.includes(effort.name as typeof PB_DISTANCES[number])) continue
            if (!effort.pr_rank || effort.pr_rank > 3) continue

            const dateKey = selectedYear === null
                ? new Date(activity.start_date_local).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
                : (() => {
                    const d = new Date(activity.start_date_local)
                    return d.getDate() === 1 ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] : ''
                })()

            // Find the matching chartData entry by fullDate
            const fullDate = new Date(activity.start_date_local).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

            const marker: PBMarker = {
                distanceName: effort.name,
                displayName: PB_DISPLAY_NAMES[effort.name] || effort.name,
                prRank: effort.pr_rank,
                movingTime: effort.moving_time,
                effortDistance: effort.distance,
                activityName: activity.name,
                fullDate,
                polyline: activity.map?.summary_polyline
                    ? decodePolyline(activity.map.summary_polyline)
                    : null,
            }

            if (!pbByDate.has(fullDate)) pbByDate.set(fullDate, [])
            pbByDate.get(fullDate)!.push(marker)
        }
    }

    return chartData.map(entry => {
        const markers = pbByDate.get(entry.fullDate)
        if (markers && markers.length > 0) {
            return {
                ...entry,
                pbMarkers: markers,
                pbDistance: entry.distance || 0.1, // need a value for scatter Y positioning
            }
        }
        return { ...entry, pbMarkers: undefined, pbDistance: null }
    })
}, [chartData, activities, selectedYear])

const pbTotal = React.useMemo(() =>
    chartDataWithPBs.filter(d => d.pbMarkers && d.pbMarkers.length > 0).length
, [chartDataWithPBs])
```

- [ ] **Step 4: Update the total memo and chart data reference**

Update the `total` memo to use `chartDataWithPBs`:

```typescript
const total = React.useMemo(() => ({
    distance: chartDataWithPBs.reduce((acc, curr) => acc + curr.distance, 0),
    races: chartDataWithPBs.filter(d => d.isRace).length,
}), [chartDataWithPBs])
```

Update the `<ComposedChart>` to use `chartDataWithPBs` instead of `chartData`:

```tsx
<ComposedChart data={chartDataWithPBs} margin={{ top: 16, right: 4, left: -20, bottom: 4 }}>
```

Also update the XAxis `interval` calculation:

```tsx
interval={selectedYear !== null ? undefined : Math.max(0, Math.floor(chartDataWithPBs.length / 8) - 1)}
```

- [ ] **Step 5: Add PB toggle button**

In the header controls area, after the races toggle button (after the closing `)}` of the races button block), add:

```tsx
{pbTotal > 0 && (
    <button
        onClick={() => setShowPBs(!showPBs)}
        className={`text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
            showPBs
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-white/[0.04] border-white/[0.08] text-[#71717a] hover:text-white hover:border-white/[0.12]'
        }`}
    >
        <Medal className="h-3 w-3" />
        <span className="hidden sm:inline">PBs</span>
        <span className="text-[10px] opacity-70">{pbTotal}</span>
    </button>
)}
```

- [ ] **Step 6: Add PB Scatter layer**

After the existing `{showRaces && (<Scatter ...>)}` block (before `</ComposedChart>`), add the PB scatter:

```tsx
{showPBs && (
    <Scatter
        dataKey="pbDistance"
        name="PB"
        shape={(props: { cx?: number; cy?: number; payload?: ChartEntry }) => {
            if (!props.payload?.pbMarkers || !props.cx || !props.cy) return null
            const markers = props.payload.pbMarkers
            // Show the highest-ranked PB marker for this day
            const best = markers.reduce((a, b) => a.prRank <= b.prRank ? a : b)
            const colors = PB_RANK_COLORS[best.prRank] || PB_RANK_COLORS[1]
            const yOffset = props.payload.isRace ? -28 : -10

            return (
                <g
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                        const rect = chartWrapperRef.current?.getBoundingClientRect()
                        if (!rect) return
                        setHoveredPB({
                            marker: best,
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                        })
                    }}
                    onMouseLeave={() => setHoveredPB(null)}
                >
                    <circle cx={props.cx} cy={props.cy + yOffset} r={16} fill="transparent" />
                    <circle cx={props.cx} cy={props.cy + yOffset} r={10} fill={colors.fill} fillOpacity={0.15} />
                    <circle cx={props.cx} cy={props.cy + yOffset} r={7} fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5} />
                    {/* Medal icon centered in circle */}
                    <g transform={`translate(${props.cx - 4.5}, ${props.cy + yOffset - 4.5}) scale(0.375)`}>
                        <path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7L12 2z" fill="#1c1c26" />
                    </g>
                </g>
            )
        }}
    >
        {chartDataWithPBs.map((entry, i) => (
            <Cell key={i} fill={entry.pbMarkers ? PB_RANK_COLORS[entry.pbMarkers[0]?.prRank || 1].fill : 'transparent'} />
        ))}
    </Scatter>
)}
```

- [ ] **Step 7: Add PBPopup component and render it**

Add this component after the existing `RacePopup` component:

```typescript
function PBPopup({ marker }: { marker: PBMarker }) {
    const colors = PB_RANK_COLORS[marker.prRank] || PB_RANK_COLORS[1]
    const rankLabel = marker.prRank === 1 ? '1st' : marker.prRank === 2 ? '2nd' : '3rd'

    return (
        <div className="bg-[#1c1c26]/95 backdrop-blur-sm border rounded-xl px-4 py-3 shadow-2xl text-sm min-w-[200px]"
            style={{ borderColor: `${colors.fill}33` }}>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/[0.06]">
                <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ backgroundColor: `${colors.fill}33` }}>
                    <Medal className="h-3.5 w-3.5" style={{ color: colors.fill }} />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-xs uppercase tracking-wide" style={{ color: colors.fill }}>{rankLabel} Best</p>
                    <p className="text-white font-semibold text-sm leading-tight">{marker.displayName}</p>
                </div>
            </div>
            <p className="text-[#52525b] text-[10px] mb-2">{marker.fullDate}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div>
                    <p className="text-[#52525b] text-[9px] uppercase tracking-wide">Time</p>
                    <p className="text-white text-sm font-bold tabular-nums">{formatDuration(marker.movingTime)}</p>
                </div>
                <div>
                    <p className="text-[#52525b] text-[9px] uppercase tracking-wide">Pace</p>
                    <p className="text-white text-sm font-bold tabular-nums">{formatPace(marker.movingTime, marker.effortDistance)} /km</p>
                </div>
            </div>
            <p className="text-[#52525b] text-[10px] mt-2 truncate max-w-[200px]">{marker.activityName}</p>
            {marker.polyline && marker.polyline.length > 1 && (
                <div className="mt-2 flex justify-center">
                    <MiniRoute points={marker.polyline} />
                </div>
            )}
        </div>
    )
}
```

In the JSX, after the existing race popup render block (after the `})()}` on line ~311), add the PB popup:

```tsx
{hoveredPB && chartWrapperRef.current && (() => {
    const rect = chartWrapperRef.current!.getBoundingClientRect()
    const popupH = 280
    const popupW = 230
    const spaceBelow = rect.height - hoveredPB.y
    const spaceRight = rect.width - hoveredPB.x
    const top = spaceBelow < popupH ? hoveredPB.y - popupH + 20 : hoveredPB.y - 40
    const left = spaceRight < popupW + 20 ? hoveredPB.x - popupW - 8 : hoveredPB.x + 16
    return (
        <div className="absolute z-50 pointer-events-none" style={{ left, top }}>
            <PBPopup marker={hoveredPB.marker} />
        </div>
    )
})()}
```

- [ ] **Step 8: Update tooltip to suppress on PB hover**

Update the `<Tooltip>` component to also suppress on PB hover:

```tsx
<Tooltip
    content={hoveredRace || hoveredPB ? () => null : <CustomTooltip />}
    cursor={hoveredRace || hoveredPB ? false : { fill: 'rgba(252,76,2,0.04)' }}
    allowEscapeViewBox={{ x: true, y: true }}
    offset={20}
/>
```

- [ ] **Step 9: Test in browser**

Reload the app (clear localStorage to force re-fetch with best_efforts). On the Chart tab:
- The "PBs" toggle appears with a count
- Gold/silver/bronze markers appear on activities with PBs
- Hovering shows the PBPopup with time, pace, distance name
- PB markers offset above race markers when both exist
- Toggling PBs off hides the markers

- [ ] **Step 10: Commit**

```bash
git add components/StravaChart.tsx
git commit -m "feat: add PB scatter markers with medal icons and popup to chart"
```

---

### Task 6: PB Stats Section

**Files:**
- Create: `components/PBStats.tsx`
- Modify: `components/Stats.tsx`

- [ ] **Step 1: Create the PBStats component**

Create `components/PBStats.tsx` with the full implementation:

```typescript
'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip as RechartsTooltip } from 'recharts'
import { Medal, ChevronDown } from 'lucide-react'
import { SpotlightCard } from './SpotlightCard'
import { StravaActivity, BestEffort } from '@/types/strava'

const PB_DISTANCES = ['1K', '5K', '10K', 'Half-Marathon', 'Marathon', '50K'] as const
const PB_DISPLAY_NAMES: Record<string, string> = {
    '1K': '1K',
    '5K': '5K',
    '10K': '10K',
    'Half-Marathon': 'Half Marathon',
    'Marathon': 'Marathon',
    '50K': '50K',
}

interface PBRecord {
    movingTime: number
    distance: number    // meters
    date: string        // ISO date
    activityName: string
    prRank: number
}

interface DistancePBData {
    distanceName: string
    displayName: string
    currentBest: PBRecord
    progression: PBRecord[] // chronological, every time it was #1
    top3: PBRecord[]        // top 3 fastest
}

function formatPace(seconds: number, meters: number): string {
    if (meters === 0) return '—'
    const paceSeconds = seconds / (meters / 1000)
    const m = Math.floor(paceSeconds / 60)
    const s = Math.round(paceSeconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDateShort(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PBCard({ data }: { data: DistancePBData }) {
    const [expanded, setExpanded] = useState(false)

    const chartPoints = useMemo(() =>
        data.progression.map(p => ({
            time: p.movingTime,
            date: formatDateShort(p.date),
        }))
    , [data.progression])

    // Invert Y so faster times are higher
    const maxTime = Math.max(...chartPoints.map(p => p.time))
    const minTime = Math.min(...chartPoints.map(p => p.time))

    return (
        <SpotlightCard className="rounded-xl bg-[#16161d] border border-white/[0.06] overflow-hidden card-glow">
            <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 to-yellow-400" />
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20">
                        <Medal className="h-4 w-4 text-amber-400" />
                    </div>
                    <span className="text-base font-semibold text-white">{data.displayName}</span>
                </div>

                {/* Current PB */}
                <div className="mb-3">
                    <p className="text-[10px] text-[#52525b] uppercase tracking-wide mb-1">Current PB</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-white tabular-nums">{formatTime(data.currentBest.movingTime)}</span>
                        <span className="text-sm text-[#71717a] tabular-nums">{formatPace(data.currentBest.movingTime, data.currentBest.distance)} /km</span>
                    </div>
                    <p className="text-xs text-[#52525b] mt-0.5 truncate">
                        {data.currentBest.activityName} — {formatDateShort(data.currentBest.date)}
                    </p>
                </div>

                {/* Top 3 */}
                {data.top3.length > 1 && (
                    <div className="space-y-1.5 mb-3">
                        {data.top3.map((record, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                <span className={`w-4 text-center font-bold tabular-nums ${
                                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : 'text-amber-600'
                                }`}>{i + 1}</span>
                                <span className="text-white tabular-nums font-medium">{formatTime(record.movingTime)}</span>
                                <span className="text-[#52525b] tabular-nums">{formatPace(record.movingTime, record.distance)} /km</span>
                                <span className="text-[#3f3f46] ml-auto">{formatDateShort(record.date)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Progression toggle */}
                {data.progression.length > 1 && (
                    <>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center justify-between w-full py-2 text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors cursor-pointer"
                        >
                            <span>Progression ({data.progression.length} PRs)</span>
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden"
                                >
                                    {/* Mini chart */}
                                    {chartPoints.length > 1 && (
                                        <div className="h-24 mb-3">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartPoints}>
                                                    <defs>
                                                        <linearGradient id="pbLineGradient" x1="0" y1="0" x2="1" y2="0">
                                                            <stop offset="0%" stopColor="#71717a" />
                                                            <stop offset="100%" stopColor="#fbbf24" />
                                                        </linearGradient>
                                                    </defs>
                                                    <YAxis domain={[minTime * 0.95, maxTime * 1.05]} hide reversed />
                                                    <RechartsTooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload?.length) return null
                                                            const p = payload[0]?.payload as { time: number; date: string }
                                                            if (!p) return null
                                                            return (
                                                                <div className="bg-[#1c1c26]/95 backdrop-blur-sm border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs">
                                                                    <p className="text-white font-medium tabular-nums">{formatTime(p.time)}</p>
                                                                    <p className="text-[#52525b]">{p.date}</p>
                                                                </div>
                                                            )
                                                        }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="time"
                                                        stroke="url(#pbLineGradient)"
                                                        strokeWidth={2}
                                                        dot={{ r: 3, fill: '#fbbf24', stroke: '#fbbf24' }}
                                                        activeDot={{ r: 5, fill: '#fbbf24', stroke: '#fcd34d', strokeWidth: 2 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {/* Progression list */}
                                    <div className="space-y-1.5">
                                        {data.progression.slice().reverse().map((record, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <span className="w-4 text-center text-[#3f3f46] tabular-nums">{data.progression.length - i}</span>
                                                <span className="text-white tabular-nums font-medium">{formatTime(record.movingTime)}</span>
                                                <span className="text-[#52525b] tabular-nums">{formatPace(record.movingTime, record.distance)} /km</span>
                                                <span className="text-[#3f3f46] ml-auto">{formatDateShort(record.date)}</span>
                                                {i === 0 && <span className="text-amber-400 text-[10px]">★</span>}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </SpotlightCard>
    )
}

export function PBStats({ activities }: { activities: StravaActivity[] }) {
    const pbData = useMemo(() => {
        const effortsByDistance = new Map<string, { effort: BestEffort; activity: StravaActivity }[]>()

        for (const activity of activities) {
            if (!activity.best_efforts) continue
            for (const effort of activity.best_efforts) {
                if (!PB_DISTANCES.includes(effort.name as typeof PB_DISTANCES[number])) continue
                if (!effortsByDistance.has(effort.name)) effortsByDistance.set(effort.name, [])
                effortsByDistance.get(effort.name)!.push({ effort, activity })
            }
        }

        const results: DistancePBData[] = []

        for (const distName of PB_DISTANCES) {
            const efforts = effortsByDistance.get(distName)
            if (!efforts || efforts.length === 0) continue

            // Sort by time (fastest first) for top 3
            const sortedByTime = [...efforts].sort((a, b) => a.effort.moving_time - b.effort.moving_time)
            const top3: PBRecord[] = sortedByTime.slice(0, 3).map(e => ({
                movingTime: e.effort.moving_time,
                distance: e.effort.distance,
                date: e.effort.start_date_local || e.activity.start_date_local,
                activityName: e.activity.name,
                prRank: e.effort.pr_rank || 0,
            }))

            // Progression: efforts where pr_rank === 1, sorted chronologically
            const prOnes = efforts
                .filter(e => e.effort.pr_rank === 1)
                .sort((a, b) => new Date(a.activity.start_date_local).getTime() - new Date(b.activity.start_date_local).getTime())
                .map(e => ({
                    movingTime: e.effort.moving_time,
                    distance: e.effort.distance,
                    date: e.effort.start_date_local || e.activity.start_date_local,
                    activityName: e.activity.name,
                    prRank: 1,
                }))

            results.push({
                distanceName: distName,
                displayName: PB_DISPLAY_NAMES[distName] || distName,
                currentBest: top3[0],
                progression: prOnes.length > 0 ? prOnes : [top3[0]], // fallback if no pr_rank data
                top3,
            })
        }

        return results
    }, [activities])

    if (pbData.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="flex items-center gap-2 mb-3">
                <Medal className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Personal Bests</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pbData.map(data => (
                    <PBCard key={data.distanceName} data={data} />
                ))}
            </div>
        </motion.div>
    )
}
```

- [ ] **Step 2: Add PBStats to the Stats tab**

In `components/Stats.tsx`, add the import at the top:

```typescript
import { PBStats } from './PBStats'
```

Then, in the JSX return, after the closing `</div>` of the `flex flex-col lg:flex-row gap-5` container (line 189), and before the final closing `</div>` of the `space-y-5` container, add:

```tsx
<PBStats activities={activities} />
```

Note: `activities` is the unfiltered prop (all activities), not `filtered`. PBs should show across all activities regardless of sport filter, since best efforts are only for running anyway.

- [ ] **Step 3: Verify the project compiles**

Run: `cd /Users/tordartommervik/Documents/code/shadcn-strava-visualiser && npx next build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 4: Test in browser**

Navigate to the Stats tab. Verify:
- PB cards appear below the goal service for each distance you have data for
- Current PB shows time, pace, activity name, and date
- Top 3 list shows ranked times
- Clicking "Progression" expands to show the mini chart and chronological list
- The mini chart has dots at each PR, with time decreasing (faster) over time
- Cards only appear for distances with data
- The gold gradient bar distinguishes them from stat cards

- [ ] **Step 5: Commit**

```bash
git add components/PBStats.tsx components/Stats.tsx
git commit -m "feat: add PB stats section with progression charts to Stats tab"
```

---

### Task 7: Final Polish and Verification

**Files:**
- All modified files

- [ ] **Step 1: Full build check**

Run: `cd /Users/tordartommervik/Documents/code/shadcn-strava-visualiser && npx next build 2>&1 | tail -30`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Lint check**

Run: `cd /Users/tordartommervik/Documents/code/shadcn-strava-visualiser && npx next lint 2>&1 | tail -20`

Fix any lint errors that appear.

- [ ] **Step 3: End-to-end manual test**

Test the complete flow:
1. Clear localStorage, reload — verify data fetches with best_efforts
2. Stats tab: PB cards visible with correct data, progression expands/collapses
3. Chart tab: Year dropdown works, selecting a year shows 365 days with gaps
4. Chart tab: PB markers visible, hover shows popup, toggle hides them
5. Chart tab: Race markers and PB markers coexist on the same activity
6. Chart tab: "All time" view works as before
7. Mobile: verify both features work on small viewport

- [ ] **Step 4: Commit any polish fixes**

```bash
git add -A
git commit -m "chore: lint fixes and final polish"
```
