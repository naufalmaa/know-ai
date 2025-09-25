// CHANGED: This is the complete and corrected file to fix the syntax error.
// It includes all original routes plus the necessary fixes for robust authentication.
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify' // Added types for clarity
import { db } from '../db'
import crypto from 'crypto'

// Helper function to generate session token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Helper function to get client IP
function getClientIP(req: any): string {
  return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || '127.0.0.1'
}

// Helper function to log user action
async function logAction(
  userId: string, 
  action: string, 
  resourceType: string, 
  resourceId?: string, 
  oldValues?: any, 
  newValues?: any,
  req?: any
) {
  const ip = req ? getClientIP(req) : null
  const userAgent = req?.headers['user-agent'] || null
  
  await db.query(`
    select log_user_action($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    userId, action, resourceType, resourceId || null,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    ip, userAgent
  ]).catch(err => {
    // Gracefully handle if logging function doesn't exist yet
    console.warn("Could not log user action:", err.message);
  });
}

// Middleware to verify authentication
// CHANGED: Export the middleware functions
export async function requireAuth(req: FastifyRequest, rep: FastifyReply) {
  const token = req.cookies?.token || req.headers?.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return rep.code(401).send({ error: 'Authentication required' })
  }
  
  const sessionQuery = await db.query(`
    select s.user_id, u.email, u.role, u.first_name, u.last_name, u.is_active
    from sessions s
    join users u on s.user_id = u.id
    where s.token = $1 and s.expires_at > now() and u.is_active = true
  `, [token])
  
  if (!sessionQuery.rowCount) {
    return rep.code(401).send({ error: 'Invalid or expired session' })
  }
  
  req.user = sessionQuery.rows[0]
  return null
}

export function requirePermission(permission: string) {
  return async (req: FastifyRequest, rep: FastifyReply) => {
    const authResult = await requireAuth(req, rep)
    if (authResult) return authResult
    
    if (!req.user || !req.user.role) {
      return rep.code(401).send({ error: 'User role not found in session.' });
    }
    
    const hasPermission = await db.query(
      'select user_has_permission($1, $2) as has_permission',
      [req.user.role, permission]
    )
    
    if (!hasPermission.rows[0]?.has_permission) {
      return rep.code(403).send({ error: 'Insufficient permissions' })
    }
    
    return null
  }
}

export async function routes(app: FastifyInstance) {
  
  // Register new user (admin/superadmin only)
  app.post('/api/auth/register', async (req, rep) => {
    const authResult = await requirePermission('users.create')(req, rep)
    if (authResult) return authResult
    
    const { email, password, firstName, lastName, role } = req.body as {
      email: string, password: string, firstName: string, lastName: string, role: string
    }
    
    if (!email || !password || !firstName || !lastName) {
      return rep.code(400).send({ error: 'Missing required fields' })
    }
    
    if (!['user', 'admin'].includes(role)) {
      return rep.code(400).send({ error: 'Invalid role' })
    }

    if (!req.user || !req.user.user_id) {
        return rep.code(401).send({ error: 'Authentication error' });
    }
    
    if (role === 'admin' && req.user.role !== 'superadmin') {
      return rep.code(403).send({ error: 'Only superadmin can create admin users' })
    }
    
    try {
      const r = await db.query(`
        insert into users(email, password_hash, role, first_name, last_name, created_by)
        values($1, crypt($2, gen_salt('bf')), $3, $4, $5, $6)
        returning id, email, role, first_name, last_name, created_at
      `, [email, password, role, firstName, lastName, req.user.user_id])
      
      const newUser = r.rows[0]
      await logAction(req.user.user_id, 'create', 'users', newUser.id, null, newUser, req)
      
      return newUser;
    } catch (error: any) {
      if (error.code === '23505') {
        return rep.code(400).send({ error: 'Email already exists' })
      }
      throw error
    }
  })

  // Login
  app.post('/api/auth/login', async (req, rep) => {
    const { email, password } = req.body as { email: string, password: string }
    
    if (!email || !password) return rep.code(400).send({ error: 'Email and password required' })
    
    const r = await db.query(`
      select id, email, role, first_name, last_name, password_hash, is_active from users where email = $1
    `, [email])
    
    if (!r.rowCount) return rep.code(401).send({ error: 'Invalid credentials' })
    
    const user = r.rows[0]
    if (!user.is_active) return rep.code(401).send({ error: 'Account is disabled' })
    
    const passwordCheck = await db.query('select password_hash = crypt($1, password_hash) as valid from users where id = $2', [password, user.id])
    if (!passwordCheck.rows[0]?.valid) return rep.code(401).send({ error: 'Invalid credentials' })
    
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    await db.query(`insert into sessions (user_id, token, expires_at) values ($1, $2, $3)`, [user.id, token, expiresAt])
    await db.query('update users set last_login = now() where id = $1', [user.id])
    await logAction(user.id, 'login', 'auth', undefined, null, { email }, req)
    
    rep.setCookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/', // Set path to root
      expires: expiresAt,
      secure: process.env.NODE_ENV === 'production'
    })
    
    return {
      id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name, token
    }
  })

  // Get current user info
  app.get('/api/auth/me', async (req, rep) => {
    const authResult = await requireAuth(req, rep)
    if (authResult) return authResult
    
    const user = req.user
    if (!user) {
      return rep.code(401).send({ error: 'User data not found after authentication.' })
    }
    
    return {
      id: user.user_id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name
    }
  })

  // Logout
  app.post('/api/auth/logout', async (req, rep) => {
    const token = req.cookies?.token || req.headers?.authorization?.replace('Bearer ', '')
    if (token) {
      await db.query('delete from sessions where token = $1', [token])
    }
    rep.clearCookie('token')
    return { message: 'Logged out successfully' }
  })

  // Change password
  app.post('/api/auth/change-password', async (req, rep) => {
    const authResult = await requireAuth(req, rep)
    if (authResult) return authResult

    if (!req.user || !req.user.user_id) {
        return rep.code(401).send({ error: 'Authentication error' });
    }
    
    const { currentPassword, newPassword } = req.body as { currentPassword: string, newPassword: string }
    
    if (!currentPassword || !newPassword) return rep.code(400).send({ error: 'Current and new password required' })
    if (newPassword.length < 8) return rep.code(400).send({ error: 'New password must be at least 8 characters' })
    
    const passwordCheck = await db.query('select password_hash = crypt($1, password_hash) as valid from users where id = $2', [currentPassword, req.user.user_id])
    if (!passwordCheck.rows[0]?.valid) return rep.code(400).send({ error: 'Current password is incorrect' })
    
    await db.query(`update users set password_hash = crypt($1, gen_salt('bf')) where id = $2`, [newPassword, req.user.user_id])
    await logAction(req.user.user_id, 'change_password', 'auth', undefined, null, null, req)
    
    return { message: 'Password changed successfully' }
  })

  // app.decorate('requireAuth', requireAuth)
  // app.decorate('requirePermission', requirePermission)
}