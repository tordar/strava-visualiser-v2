# Year Filter & Personal Best Features

## Overview

Two features for the Strava Visualiser:

1. **Year filter on chart** — select a specific year to view, showing all 365/366 days (including empty days with no activity)
2. **Personal Best tracking** — fetch and display top-3 PBs for 1K, 5K, 10K, Half Marathon, Marathon, and 50K distances, with chart markers and a dedicated stats section with progression history

---

## Feature 1: Chart Year Filter

### UI

A dropdown selector in the chart header bar, next to the existing "Races" toggle button. Options:

- **"All time"** (default) — current behavior, only days with activities shown
- **Each year the user has data** (e.g. "2024", "2025") — shows all 365/366 days for that year

The dropdown uses the same visual style as the sport filter: `bg-white/[0.04] border border-white/[0.08] rounded-lg` with the custom SVG chevron.

### Year View Behavior

When a specific year is selected:

- X-axis shows all days of the year (Jan 1 through Dec 31), not just days with activities
- Days without activities show **no bar** — empty space preserving the day's position
- X-axis labels show month abbreviations (Jan, Feb, Mar...) evenly spaced
- The chart data array is built by generating every day of the selected year, then filling in activity distances where they exist (summing if multiple activities on one day)
- Total distance and race count in the header update to reflect the filtered year

When "All time" is selected:

- Current behavior is preserved exactly (only activity days shown, labeled "MMM YY")

### Data Shape

```typescript
// Year view: one entry per calendar day
interface YearDayEntry extends ChartEntry {
    dayOfYear: number  // 1-366
    monthLabel: string // "Jan", "Feb", etc. (only on 1st of month for tick labels)
}
```

The `chartData` memo switches between two generation paths based on `selectedYear`:
- `null` (all time): current logic unchanged
- `number` (specific year): generate 365/366 entries, merge in activity data

---

## Feature 2: Personal Best Data Fetching

### API Changes

**New fields on `StravaActivity` type:**

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
    // ... existing fields ...
    pr_count?: number       // from list endpoint — number of PRs in this activity
    best_efforts?: BestEffort[]  // from detail endpoint
}
```

### Fetching Strategy

The list endpoint (`GET /athlete/activities`) already returns `pr_count` — we just need to include it in the response. The dashboard API route is modified to:

1. Fetch all activities as before (list endpoint, paginated)
2. Identify activities with `pr_count > 0`
3. For those activities, fetch the detail endpoint (`GET /activities/{id}`) to get `best_efforts`
4. Merge `best_efforts` into the activity objects
5. Detail fetches are batched (5 concurrent) to respect rate limits

**Rate limit considerations:**
- Strava allows 100 requests per 15 minutes, 1000 per day
- A user with 200 PR activities would need 200 detail calls + ~25 list calls = 225 total
- Batching 5 at a time keeps this manageable
- The existing localStorage cache means this only happens on first load / manual refresh

### Cache

The existing `strava_dashboard_v2` cache key is bumped to `strava_dashboard_v3` to invalidate old caches that lack PB data. The cache structure is unchanged — `best_efforts` is simply part of the activity objects.

---

## Feature 3: PB Markers on Chart

### Visual Design

PB markers appear on the chart as scatter points, similar to race markers but with a medal aesthetic:

| pr_rank | Color | Icon |
|---------|-------|------|
| 1 (gold) | `#fbbf24` (amber-400) | Medal/star |
| 2 (silver) | `#9ca3af` (gray-400) | Medal/star |
| 3 (bronze) | `#d97706` (amber-600) | Medal/star |

Markers are circles with a medal icon inside (similar pattern to the race trophy markers). They sit above the bar, offset from race markers if both exist on the same activity.

### Toggle

A "PBs" toggle button in the chart header, next to the existing "Races" toggle. Same style:
- Active: `bg-emerald-500/10 border-emerald-500/30 text-emerald-400`
- Uses a `Medal` icon from lucide-react
- Shows count of PB activities

### Popup

On hover, a popup appears (same pattern as `RacePopup`) showing:

- Medal icon with rank badge (gold/silver/bronze)
- Distance name (e.g. "5K Personal Best")
- Time and pace
- Activity name and date
- How much faster/slower than current #1 (for rank 2 and 3)
- Mini route map (if polyline available)

### Data Flow

The chart component receives activities that already include `best_efforts`. It extracts PB markers by:

1. For each activity with `best_efforts`, check each effort for `pr_rank` of 1, 2, or 3
2. Filter to the 6 target distances: "1K", "5K", "10K", "Half-Marathon", "Marathon", "50K"
3. Create scatter points for each qualifying effort

If an activity has both a race marker and a PB marker, both are shown (PB slightly higher offset).

---

## Feature 4: PB Stats Section

### Location

A new section in the Stats tab, below the existing stat cards and goal service. Full width.

### Layout

A responsive grid of cards — one per distance that has data. Each card is a `SpotlightCard` with the same styling as existing stat cards.

**Card structure:**

```
┌─────────────────────────────────────┐
│ ▰ gradient bar (gold)               │
│                                     │
│ 🏅 5K                               │
│                                     │
│ Current PB                          │
│ 16:42  (3:20/km)                    │
│ "Parkrun #127" — 14 Mar 2025       │
│                                     │
│ ▼ Progression (5 PRs)      [chart]  │
│                                     │
│ (expanded:)                         │
│ ┌─ mini line chart ──────────────┐  │
│ │  time ↓                        │  │
│ │    ·                           │  │
│ │      ·    ·                    │  │
│ │            ·  ·                │  │
│ │  date →                        │  │
│ └────────────────────────────────┘  │
│                                     │
│  1. 16:42  3:20/km  14 Mar 2025  ★  │
│  2. 17:01  3:24/km  08 Jan 2025     │
│  3. 17:15  3:27/km  22 Nov 2024     │
│  4. 17:30  3:30/km  15 Sep 2024     │
│  5. 18:02  3:36/km  03 Jun 2024     │
└─────────────────────────────────────┘
```

### Progression Data

"Progression" means every time a distance reached a new #1 (i.e. every `best_effort` where `pr_rank === 1` at the time of upload). This is exactly what the API provides — `pr_rank: 1` is stamped at upload time when it was the all-time best.

The progression list is sorted chronologically (oldest first), showing how the PB improved over time.

### Mini Chart

A small Recharts `LineChart` inside each expanded card:
- X-axis: dates of each PR #1
- Y-axis: time (inverted — faster times higher)
- Line: gradient from muted to gold
- Dots at each data point
- No axis labels (small space) — rely on the list below for exact values

### Expand/Collapse

Each card has a clickable "Progression (N PRs)" row that toggles the expanded state. Uses Framer Motion `AnimatePresence` for smooth height animation, consistent with the mobile menu sheet pattern.

### Distances

Only distances with at least one best effort are shown. Order: 1K, 5K, 10K, Half Marathon, Marathon, 50K.

**Distance name mapping** (API name to display name):

| API name | Display |
|----------|---------|
| "1K" | "1K" |
| "5K" | "5K" |
| "10K" | "10K" |
| "Half-Marathon" | "Half Marathon" |
| "Marathon" | "Marathon" |
| "50K" | "50K" |

### Color

Each card uses a gold gradient top bar: `bg-gradient-to-r from-amber-500 to-yellow-400`. The medal icon uses gold coloring. This distinguishes PB cards from the existing stat cards which use orange/blue/green.

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `types/strava.ts` | Add `BestEffort` interface, add `pr_count` and `best_efforts` to `StravaActivity` |
| `app/api/strava/dashboard/route.ts` | Fetch activity details for `pr_count > 0` activities, merge `best_efforts` |
| `components/StravaData.tsx` | Bump cache key to `v3`, remove duplicate `StravaActivity` interface (use `types/strava.ts`), pass PB data through |
| `components/StravaChart.tsx` | Add year dropdown, empty-day generation, PB scatter markers, PB popup, PB toggle |
| `components/PBStats.tsx` | **New file** — PB stats cards with progression charts |
| `components/Stats.tsx` | Import and render `PBStats` section below goal service |

---

## Non-Goals

- Segment efforts / KOMs (only best efforts for standard distances)
- PBs for non-running activities (Strava only generates best efforts for runs)
- Real-time PB notifications
- Editing or deleting PB data
