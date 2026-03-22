const express = require('express');
const router = express.Router();
const { generateToken, hashPassword, verifyPassword, authenticate } = require('../middleware/auth');

// Initialize auth routes with database
function initAuthRoutes(db) {
  
  // Register new user
  router.post('/register', (req, res) => {
    let { username, email, password, firstName, lastName, role = 'patient', patientId } = req.body;

    // Normalize username/email for case-insensitive handling
    if (username && typeof username === 'string') username = username.trim().toLowerCase();
    if (email && typeof email === 'string') email = email.trim().toLowerCase();
    
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['username', 'email', 'password', 'firstName', 'lastName']
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'patient'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        validRoles
      });
    }
    
    const passwordHash = hashPassword(password);
    
    const query = `
      INSERT INTO users (username, email, password_hash, first_name, last_name, role, patient_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    db.run(query, [username, email, passwordHash, firstName, lastName, role, patientId || null], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(409).json({ 
            error: 'Username or email already exists'
          });
        }
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Registration failed' });
      }
      
      const userId = this.lastID;
      const token = generateToken(userId, username, role);
      
      // Log the action
      db.run(
        'INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address) VALUES (?, ?, ?, ?, ?)',
        [userId, 'register', 'user', userId, req.ip]
      );
      
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: userId,
          username,
          email,
          firstName,
          lastName,
          role
        },
        token
      });
    });
  });
  
  // Login
  router.post('/login', (req, res) => {
    let { username, password } = req.body;

    // Normalize username for case-insensitive matching (allow login via email as well)
    if (username && typeof username === 'string') username = username.trim().toLowerCase();
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required'
      });
    }
    
    // Use LOWER() for case-insensitive matching against stored usernames/emails
    const query = `
      SELECT id, username, email, password_hash, first_name, last_name, role, is_active, patient_id
      FROM users 
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `;
    
    db.get(query, [username, username], (err, user) => {
      if (err) {
        console.error('Login query error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      
      if (!user) {
        const details = JSON.stringify({ attemptedUsername: username, userAgent: req.get('User-Agent'), origin: req.get('Origin') || req.get('Referer') || null });
        console.warn(`⚠ Failed login - user not found: ${username} - ip=${req.ip} ua=${req.get('User-Agent')}`);
        db.run(
          'INSERT INTO audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
          [null, 'failed_login', details, req.ip]
        );
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }
      
      if (!verifyPassword(password, user.password_hash)) {
        const details = JSON.stringify({ attemptedUsername: username, userId: user.id, userAgent: req.get('User-Agent'), origin: req.get('Origin') || req.get('Referer') || null });
        console.warn(`⚠ Failed login - invalid password for user: ${username} (id=${user.id}) - ip=${req.ip} ua=${req.get('User-Agent')}`);
        db.run(
          'INSERT INTO audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
          [user.id, 'failed_login', details, req.ip]
        );
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Update last login
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      // Log the action
      db.run(
        'INSERT INTO audit_log (user_id, action, ip_address) VALUES (?, ?, ?)',
        [user.id, 'login', req.ip]
      );
      
      const token = generateToken(user.id, user.username, user.role);
      
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          patientId: user.patient_id
        },
        token
      });
    });
  });
  
  // Get current user profile (requires authentication)
  router.get('/me', authenticate, (req, res) => {
    const query = `
      SELECT id, username, email, first_name, last_name, role, is_active, patient_id, created_at, last_login
      FROM users 
      WHERE id = ?
    `;
    
    db.get(query, [req.user.userId], (err, user) => {
      if (err) {
        console.error('Get user error:', err);
        return res.status(500).json({ error: 'Failed to fetch user data' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        patientId: user.patient_id,
        createdAt: user.created_at,
        lastLogin: user.last_login
      });
    });
  });
  
  // Logout (optional - mainly for audit logging)
  router.post('/logout', authenticate, (req, res) => {
    // Log the action
    db.run(
      'INSERT INTO audit_log (user_id, action, ip_address) VALUES (?, ?, ?)',
      [req.user.userId, 'logout', req.ip]
    );
    
    res.json({ message: 'Logged out successfully' });
  });
  
  // Get role permissions
  router.get('/roles/:roleName', authenticate, (req, res) => {
    const query = 'SELECT * FROM roles WHERE name = ?';
    
    db.get(query, [req.params.roleName], (err, role) => {
      if (err) {
        console.error('Get role error:', err);
        return res.status(500).json({ error: 'Failed to fetch role' });
      }
      
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      
      res.json(role);
    });
  });
  
  // Get all roles (admin only)
  router.get('/roles', authenticate, (req, res) => {
    db.all('SELECT * FROM roles', (err, roles) => {
      if (err) {
        console.error('Get roles error:', err);
        return res.status(500).json({ error: 'Failed to fetch roles' });
      }
      
      res.json(roles);
    });
  });

  // Admin: fetch recent failed login attempts
  router.get('/failed-logins', authenticate, (req, res) => {
    // Only admins allowed
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const limit = parseInt(req.query.limit, 10) || 50;

    db.all(
      `SELECT id, user_id, action, details, ip_address, created_at FROM audit_log WHERE action = 'failed_login' ORDER BY created_at DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) {
          console.error('Get failed-logins error:', err);
          return res.status(500).json({ error: 'Failed to fetch failed login attempts' });
        }

        // Parse details JSON when possible
        const parsed = (rows || []).map(r => {
          let details = null;
          try { details = r.details ? JSON.parse(r.details) : null; } catch (e) { details = r.details; }
          return { id: r.id, userId: r.user_id, details, ip: r.ip_address, createdAt: r.created_at };
        });

        res.json(parsed);
      }
    );
  });
  
  return router;
}

module.exports = initAuthRoutes;
