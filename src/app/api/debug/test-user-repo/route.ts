import { NextResponse } from 'next/server'
import { UserRepository } from '@/lib/database/repositories/UserRepository'

export async function GET() {
  try {
    console.log('DEBUG REPO: Testing UserRepository...')
    
    // Create UserRepository instance
    const userRepo = new UserRepository()
    console.log('DEBUG REPO: UserRepository created')
    
    // Try to find user by email
    const email = 'admin@minuevaagencia.com'
    console.log('DEBUG REPO: Looking for user:', email)
    
    const user = userRepo.findByEmail(email)
    console.log('DEBUG REPO: User found:', user)
    
    return NextResponse.json({
      success: true,
      user: user || null,
      message: user ? 'User found via repository' : 'User not found via repository'
    })
    
  } catch (error) {
    console.error('DEBUG REPO: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'UserRepository test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}