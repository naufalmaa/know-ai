import { FastifyInstance } from 'fastify'
import { db } from '../db'

export async function routes(app: FastifyInstance) {
  
  // Get all users (admin/superadmin only)
  app.get('/api/users', async (req, rep) => {
    const authResult = await app.requirePermission('users.list')(req, rep)
    if (authResult) return authResult
    
    const { page = 1, limit = 20, search = '', role = '' } = req.query as any
    const offset = (page - 1) * limit
    
    let whereClause = 'where 1=1'
    const params: any[] = []
    
    if (search) {
      whereClause += ` and (email ilike $${params.length + 1} or first_name ilike $${params.length + 1} or last_name ilike $${params.length + 1})`
      params.push(`%${search}%`)
    }
    
    if (role) {
      whereClause += ` and role = $${params.length + 1}`
      params.push(role)
    }
    
    // Count total users
    const countQuery = await db.query(`
      select count(*) as total from users ${whereClause}
    `, params)
    
    // Get users with pagination
    const usersQuery = await db.query(`
      select 
        u.id, u.email, u.role, u.first_name, u.last_name, 
        u.is_active, u.created_at, u.last_login,
        creator.email as created_by_email,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
      from users u
      left join users creator on u.created_by = creator.id
      ${whereClause}
      order by u.created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
    `, [...params, limit, offset])
    
    return {
      users: usersQuery.rows.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        createdBy: user.created_by_email ? {
          email: user.created_by_email,
          firstName: user.created_by_first_name,
          lastName: user.created_by_last_name
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countQuery.rows[0].total),
        pages: Math.ceil(countQuery.rows[0].total / limit)
      }
    }
  })
  
  // Get user by ID
  app.get('/api/users/:id', async (req, rep) => {
    const authResult = await (app as any).requirePermission('users.read')(req, rep)
    if (authResult) return authResult
    
    const { id } = req.params as any
    
    // Users can only view their own profile unless they have admin permissions
    if (req.user.role === 'user' && req.user.user_id !== id) {
      return rep.code(403).send({ error: 'Can only view your own profile' })
    }
    
    const userQuery = await db.query(`
      select 
        u.id, u.email, u.role, u.first_name, u.last_name, 
        u.is_active, u.created_at, u.last_login,
        creator.email as created_by_email,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
      from users u
      left join users creator on u.created_by = creator.id
      where u.id = $1
    `, [id])
    
    if (!userQuery.rowCount) {
      return rep.code(404).send({ error: 'User not found' })
    }
    
    const user = userQuery.rows[0]
    
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      createdBy: user.created_by_email ? {
        email: user.created_by_email,
        firstName: user.created_by_first_name,
        lastName: user.created_by_last_name
      } : null
    }
  })
  
  // Update user
  app.put('/api/users/:id', async (req, rep) => {
    const authResult = await (app as any).requirePermission('users.update')(req, rep)
    if (authResult) return authResult
    
    const { id } = req.params as any
    const { firstName, lastName, email, role, isActive } = req.body as any
    
    // Users can only update their own profile (except role and isActive)
    if (req.user.role === 'user' && req.user.user_id !== id) {
      return rep.code(403).send({ error: 'Can only update your own profile' })
    }
    
    // Get current user data
    const currentUserQuery = await db.query(
      'select * from users where id = $1',
      [id]
    )
    
    if (!currentUserQuery.rowCount) {
      return rep.code(404).send({ error: 'User not found' })
    }
    
    const currentUser = currentUserQuery.rows[0]
    
    // Prevent deletion/deactivation of superadmin
    if (currentUser.role === 'superadmin' && isActive === false) {
      return rep.code(400).send({ error: 'Cannot deactivate superadmin account' })
    }
    
    // Only superadmin can change roles or activate/deactivate users
    if ((role !== undefined || isActive !== undefined) && req.user.role !== 'superadmin') {
      return rep.code(403).send({ error: 'Only superadmin can change roles or account status' })
    }
    
    // Only superadmin can create/modify admin users
    if (role === 'admin' && req.user.role !== 'superadmin') {
      return rep.code(403).send({ error: 'Only superadmin can create admin users' })
    }
    
    // Build update query dynamically
    const updates: string[] = []
    const params: any[] = []
    
    if (firstName !== undefined) {
      updates.push(`first_name = $${params.length + 1}`)
      params.push(firstName)
    }
    
    if (lastName !== undefined) {
      updates.push(`last_name = $${params.length + 1}`)
      params.push(lastName)
    }
    
    if (email !== undefined) {
      updates.push(`email = $${params.length + 1}`)
      params.push(email)
    }
    
    if (role !== undefined && req.user.role === 'superadmin') {
      updates.push(`role = $${params.length + 1}`)
      params.push(role)
    }
    
    if (isActive !== undefined && req.user.role === 'superadmin') {
      updates.push(`is_active = $${params.length + 1}`)
      params.push(isActive)
    }
    
    if (updates.length === 0) {
      return rep.code(400).send({ error: 'No valid fields to update' })
    }
    
    params.push(id)
    
    try {
      const updateQuery = await db.query(`
        update users 
        set ${updates.join(', ')}
        where id = $${params.length}
        returning id, email, role, first_name, last_name, is_active, updated_at
      `, params)
      
      const updatedUser = updateQuery.rows[0]
      
      // Log the action (handled by trigger, but we can add custom logging here)
      // The trigger will automatically log the changes
      
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        isActive: updatedUser.is_active,
        updatedAt: updatedUser.updated_at
      }
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        return rep.code(400).send({ error: 'Email already exists' })
      }
      throw error
    }
  })
  
  // Delete user
  app.delete('/api/users/:id', async (req, rep) => {
    const authResult = await (app as any).requirePermission('users.delete')(req, rep)
    if (authResult) return authResult
    
    const { id } = req.params as any
    
    // Get user to check if it's superadmin
    const userQuery = await db.query(
      'select role, email from users where id = $1',
      [id]
    )
    
    if (!userQuery.rowCount) {
      return rep.code(404).send({ error: 'User not found' })
    }
    
    const user = userQuery.rows[0]
    
    // Prevent deletion of superadmin
    if (user.role === 'superadmin') {
      return rep.code(400).send({ error: 'Cannot delete superadmin account' })
    }
    
    // Prevent users from deleting themselves
    if (req.user.user_id === id) {
      return rep.code(400).send({ error: 'Cannot delete your own account' })
    }
    
    // Only superadmin can delete admin users
    if (user.role === 'admin' && req.user.role !== 'superadmin') {
      return rep.code(403).send({ error: 'Only superadmin can delete admin users' })
    }
    
    // Delete all user sessions first
    await db.query('delete from sessions where user_id = $1', [id])
    
    // Delete user
    await db.query('delete from users where id = $1', [id])
    
    return { message: 'User deleted successfully' }
  })
  
  // Get user permissions
  app.get('/api/users/:id/permissions', async (req, rep) => {
    const authResult = await (app as any).requireAuth(req, rep)
    if (authResult) return authResult
    
    const { id } = req.params as any
    
    // Users can only view their own permissions unless they're admin
    if (req.user.role === 'user' && req.user.user_id !== id) {
      return rep.code(403).send({ error: 'Can only view your own permissions' })
    }
    
    const userQuery = await db.query(
      'select role from users where id = $1',
      [id]
    )
    
    if (!userQuery.rowCount) {
      return rep.code(404).send({ error: 'User not found' })
    }
    
    const userRole = userQuery.rows[0].role
    
    const permissionsQuery = await db.query(`
      select p.name, p.description, p.resource, p.action
      from role_permissions rp
      join permissions p on rp.permission_id = p.id
      where rp.role = $1 and rp.granted = true
      order by p.resource, p.action
    `, [userRole])
    
    return {
      role: userRole,
      permissions: permissionsQuery.rows
    }
  })
  
  // Get audit logs for a user (admin/superadmin only)
  app.get('/api/users/:id/audit', async (req, rep) => {
    const authResult = await (app as any).requirePermission('audit.read')(req, rep)
    if (authResult) return authResult
    
    const { id } = req.params as any
    const { page = 1, limit = 50 } = req.query as any
    const offset = (page - 1) * limit
    
    const auditQuery = await db.query(`
      select 
        al.id, al.action, al.resource_type, al.resource_id,
        al.old_values, al.new_values, al.ip_address, al.user_agent,
        al.created_at
      from audit_logs al
      where al.user_id = $1
      order by al.created_at desc
      limit $2 offset $3
    `, [id, limit, offset])
    
    const countQuery = await db.query(
      'select count(*) as total from audit_logs where user_id = $1',
      [id]
    )
    
    return {
      logs: auditQuery.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countQuery.rows[0].total),
        pages: Math.ceil(countQuery.rows[0].total / limit)
      }
    }
  })
  
  // Get user statistics (admin/superadmin only)
  app.get('/api/users/stats', async (req, rep) => {
    const authResult = await (app as any).requirePermission('users.list')(req, rep)
    if (authResult) return authResult
    
    const statsQuery = await db.query(`
      select 
        count(*) as total_users,
        count(case when role = 'superadmin' then 1 end) as superadmin_count,
        count(case when role = 'admin' then 1 end) as admin_count,
        count(case when role = 'user' then 1 end) as user_count,
        count(case when is_active = true then 1 end) as active_users,
        count(case when is_active = false then 1 end) as inactive_users,
        count(case when last_login > now() - interval '30 days' then 1 end) as recent_logins
      from users
    `)
    
    return statsQuery.rows[0]
  })
}