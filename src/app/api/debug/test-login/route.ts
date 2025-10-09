import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/database/services'

export async function POST(req: NextRequest) {
  try {
    console.log('DEBUG LOGIN: Starting login test...')
    
    const body = await req.json()
    const { email, password } = body
    
    console.log('DEBUG LOGIN: Credentials:', { email, password: '***' })

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password required',
        step: 'validation'
      }, { status: 400 })
    }

    // Test step 1: Check if user exists
    console.log('DEBUG LOGIN: Checking if user exists...')
    const userByEmail = AuthService.getUserByEmail(email)
    console.log('DEBUG LOGIN: User found:', userByEmail ? 'YES' : 'NO')
    
    if (!userByEmail) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        step: 'user_lookup',
        email
      }, { status: 404 })
    }

    // Test step 2: Try authentication
    console.log('DEBUG LOGIN: Attempting authentication...')
    const authenticatedUser = await AuthService.authenticate(email, password)
    console.log('DEBUG LOGIN: Authentication result:', authenticatedUser ? 'SUCCESS' : 'FAILED')

    if (!authenticatedUser) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        step: 'authentication',
        userExists: true
      }, { status: 401 })
    }

    // Test step 3: Generate token
    const token = `mock_jwt_token_${authenticatedUser.id}`
    console.log('DEBUG LOGIN: Token generated:', token)

    return NextResponse.json({
      success: true,
      message: 'Login test successful',
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        agencyId: authenticatedUser.agencyId,
        role: authenticatedUser.role
      },
      token,
      step: 'complete'
    })

  } catch (error) {
    console.error('DEBUG LOGIN: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Login test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      step: 'exception'
    }, { status: 500 })
  }
}