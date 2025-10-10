import { UserRepository } from '../repositories/UserRepository'
import { User } from '../types'

/**
 * Authentication service for handling user login and validation
 */
export class AuthService {
    private static userRepository = new UserRepository()

    /**
     * Authenticate user with email and password
     * Note: In production, passwords should be properly hashed with bcrypt
     */
    public static authenticate(
        email: string,
        password: string
    ): User | null {
        try {
            const user = this.userRepository.findByEmail(email)

            if (!user) {
                return null
            }

            // For development, we accept 'password123' for all users with dummy hash
            // In production, this should be: await bcrypt.compare(password, user.passwordHash)
            const isDummyHash =
                user.passwordHash === '$2b$10$dummy.hash.for.development'
            const isValidPassword = isDummyHash && password === 'password123'

            if (!isValidPassword) {
                return null
            }

            // Return user without password hash
            const { passwordHash, ...userWithoutPassword } = user
            return userWithoutPassword as User
        } catch (error) {
            console.error('AuthService: Authentication error:', error)
            return null
        }
    }

    /**
     * Get user by ID with agency information
     */
    public static getUserWithAgency(userId: string) {
        return this.userRepository.findByIdWithAgency(userId)
    }

    /**
     * Validate if user has access to a workspace
     */
    public static hasWorkspaceAccess(
        userId: string,
        workspaceId: string
    ): boolean {
        return this.userRepository.hasWorkspaceAccess(userId, workspaceId)
    }

    /**
     * Check if user is agency admin
     */
    public static isAgencyAdmin(userId: string, agencyId: string): boolean {
        return this.userRepository.isAgencyAdmin(userId, agencyId)
    }

    /**
     * Get user by email
     */
    public static getUserByEmail(email: string): User | null {
        const user = this.userRepository.findByEmail(email)
        if (!user) return null

        // Return user without password hash
        const { passwordHash, ...userWithoutPassword } = user
        return userWithoutPassword as User
    }

    /**
     * Get user by ID
     */
    public static getUserById(userId: string): User | null {
        const user = this.userRepository.findById(userId)
        if (!user) return null

        // Return user without password hash
        const { passwordHash, ...userWithoutPassword } = user
        return userWithoutPassword as User
    }
}
