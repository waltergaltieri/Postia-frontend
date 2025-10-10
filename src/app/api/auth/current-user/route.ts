import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // TODO: Implement real authentication
    // For now, return the current user from our clean database
    const currentUser = {
      id: 'user-1760035323771',
      email: 'admin-dcr96g@miagencia.com',
      agencyId: 'agency-1760035323771',
      role: 'admin'
    }

    return NextResponse.json({
      success: true,
      data: currentUser,
    })
  } catch (error) {
    console.error('Current user API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}