import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/database/services'

export async function GET(req: NextRequest) {
  try {
    console.log('Debug: Testing auth middleware...')
    
    // Test 1: Check headers
    const authorization = req.headers.get('authorization')
    console.log('Debug: Authorization header:', authorization)
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'No authorization header or invalid format',
        headers: Object.fromEntries(req.headers.entries())
      })
    }

    const token = authorization.split(' ')[1]
    console.log('Debug: Token:', token)

    // Test 2: Parse token
    const tokenParts = token.split('_')
    console.log('Debug: Token parts:', tokenParts)
    
    if (
      tokenParts.length < 4 ||
      tokenParts[0] !== 'mock' ||
      tokenParts[1] !== 'jwt' ||
      tokenParts[2] !== 'token'
    ) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token format',
        tokenParts
      })
    }

    const userId = tokenParts[3]
    console.log('Debug: User ID:', userId)

    // Test 3: Get user from database
    const user = AuthService.getUserById(userId)
    console.log('Debug: User from DB:', user)

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found in database',
        userId
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Auth test passed',
      user: {
        id: user.id,
        email: user.email,
        agencyId: user.agencyId,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Debug: Auth test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Auth test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}