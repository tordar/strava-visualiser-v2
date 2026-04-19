import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { StravaActivity } from "@/types/strava"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DOWNHILL_SPORTS = new Set(['AlpineSki', 'Snowboard'])

// For downhill sports, elevation down (elev_high - elev_low) is more meaningful than gain
export function activityElevation(activity: StravaActivity): number {
    if (DOWNHILL_SPORTS.has(activity.type) && activity.elev_high != null && activity.elev_low != null) {
        return activity.elev_high - activity.elev_low
    }
    return activity.total_elevation_gain
}
