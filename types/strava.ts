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
    elev_high?: number
    elev_low?: number
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
