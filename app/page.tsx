import { cookies } from 'next/headers'
import LoginHero from '../components/LoginHero'
import StravaData from '../components/StravaData'

export default async function Dashboard() {
    const cookieStore = await cookies()
    const isAuthenticated = !!cookieStore.get('strava_refresh_token')

    return isAuthenticated ? <StravaData /> : <LoginHero />
}
