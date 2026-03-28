import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
    const cookieStore = await cookies()
    cookieStore.delete('strava_access_token')
    cookieStore.delete('strava_refresh_token')

    // Optionally, revoke the Strava token
    // This would require storing and retrieving the refresh token, which is beyond the scope of this example
    // const refreshToken = ... // Get from your database
    // await fetch(`https://www.strava.com/oauth/deauthorize?access_token=${refreshToken}`, {
    //   method: 'POST',
    // })

    return NextResponse.json({ message: 'Logged out successfully' })
}