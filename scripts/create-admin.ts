#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user and API key...\n');

    // Check if admin user already exists  
    const existingAdmin = await prisma.user.findFirst({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'admin'
            },
            isActive: true
          }
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log('🔑 Use existing admin credentials or delete the user first.\n');
      return;
    }

    // Get admin email from environment or use default
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@llmmux.ai';
    const adminPassword = process.env.ADMIN_PASSWORD || generateSecurePassword();

    // Hash the password (using crypto.scrypt since bcrypt might not be available)
    const hashedPassword = await hashPassword(adminPassword);

    // Ensure admin role exists
    let adminRole = await prisma.role.findUnique({
      where: { name: 'admin' }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'admin',
          description: 'Full system administrator access',
          permissions: ['admin', 'read', 'write', 'delete'],
          priority: 100
        }
      });
      console.log('✅ Created admin role');
    }

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'System',
        lastName: 'Administrator', 
        email: adminEmail,
        password: hashedPassword,
        isActive: true,
      }
    });

    // Assign admin role to user
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        isActive: true,
        assignedAt: new Date(),
        // No expiration for admin role
      }
    });

    console.log('✅ Created admin user');
    console.log(`📧 Email: ${adminUser.email}`);
    
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`🔐 Password: ${adminPassword}`);
      console.log('⚠️  IMPORTANT: Save this password - it won\'t be shown again!\n');
    }

    // Create admin API key
    const apiKey = generateApiKey();

    const createdApiKey = await prisma.apiKey.create({
      data: {
        key: apiKey,
        name: 'Admin API Key',
        description: 'Administrative API access',
        owner: adminUser.email,
        createdById: adminUser.id,
        isActive: true,
        rateLimitRpm: 1000, // High rate limit for admin
        permissions: {
          create: {
            allowAll: true,
            allowedModels: null, // Admin has access to all models
            deniedModels: null,
          }
        }
      }
    });

    console.log('✅ Created admin API key');
    console.log(`🔑 API Key: ${apiKey}`);
    console.log('⚠️  IMPORTANT: Save this API key - it won\'t be shown again!\n');

    console.log('🎉 Admin setup complete!');
    console.log('💡 You can now use these credentials to access the admin panel.');
    console.log(`📝 Admin User ID: ${adminUser.id}`);
    console.log(`📝 API Key ID: ${createdApiKey.id}`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateApiKey(): string {
  return 'llm_' + crypto.randomBytes(32).toString('hex');
}

// Run the script
if (require.main === module) {
  createAdmin();
}