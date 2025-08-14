import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create default roles
    const roles = [
      {
        name: 'USER',
        description: 'Standard user with basic access to assigned API keys',
        permissions: [
          'api_key:use',
          'profile:read',
          'profile:update'
        ]
      },
      {
        name: 'ADMIN',
        description: 'Administrator with full API key management capabilities',
        permissions: [
          'api_key:use',
          'api_key:create',
          'api_key:read',
          'api_key:update',
          'api_key:delete',
          'metrics:read',
          'users:read',
          'profile:read',
          'profile:update'
        ]
      },
      {
        name: 'SUPER_ADMIN',
        description: 'Super administrator with full system access',
        permissions: [
          'api_key:*',
          'users:*',
          'roles:*',
          'metrics:*',
          'system:*',
          'audit:*'
        ]
      }
    ];

    for (const roleData of roles) {
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name }
      });

      if (!existingRole) {
        await prisma.role.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            permissions: roleData.permissions
          }
        });
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        console.log(`ℹ️  Role already exists: ${roleData.name}`);
      }
    }

    // Create initial super admin user
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' }
    });

    if (!superAdminRole) {
      throw new Error('SUPER_ADMIN role not found');
    }

    // Check if super admin already exists by email (simpler approach)
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@llmmux.com' }
    });

    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'SuperAdmin123!';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      const admin = await prisma.user.create({
        data: {
          firstName: 'Super',
          lastName: 'Admin',
          email: 'admin@llmmux.com',
          password: hashedPassword
        }
      });

      // Assign SUPER_ADMIN role to the user using the correct model name
      await (prisma as any).userRole.create({
        data: {
          userId: admin.id,
          roleId: superAdminRole.id,
          isActive: true
        }
      });

      // Log the user creation
      await prisma.userLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE',
          entityType: 'USER',
          entityId: admin.id.toString(),
          newValues: {
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            role: 'SUPER_ADMIN'
          },
          ipAddress: '127.0.0.1',
          userAgent: 'System Seed Script'
        }
      });

      console.log('✅ Initial super admin user created successfully!');
      console.log('Name:', `${admin.firstName} ${admin.lastName}`);
      console.log('Email:', admin.email);
      console.log('Password:', adminPassword);
      console.log('Role: SUPER_ADMIN');
      console.log('🔐 Please change the default password after first login!');
    } else {
      console.log('ℹ️  Super admin user already exists');
    }

    // Create default admin user
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });

    if (adminRole) {
      const existingRegularAdmin = await prisma.user.findUnique({
        where: { email: 'regular.admin@example.com' }
      });

      if (!existingRegularAdmin) {
        const adminPassword = process.env.REGULAR_ADMIN_PASSWORD || 'Admin123!';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        const admin = await prisma.user.create({
          data: {
            firstName: 'Regular',
            lastName: 'Admin',
            email: 'regular.admin@example.com',
            password: hashedPassword
          }
        });

        // Assign ADMIN role to the user
        await prisma.userRole.create({
          data: {
            userId: admin.id,
            roleId: adminRole.id,
            isActive: true
          }
        });

        // Log the user creation
        await prisma.userLog.create({
          data: {
            userId: admin.id,
            action: 'CREATE',
            entityType: 'USER',
            entityId: admin.id.toString(),
            newValues: {
              firstName: admin.firstName,
              lastName: admin.lastName,
              email: admin.email,
              role: 'ADMIN'
            },
            ipAddress: '127.0.0.1',
            userAgent: 'System Seed Script'
          }
        });

        console.log('✅ Regular admin user created successfully!');
        console.log('Name:', `${admin.firstName} ${admin.lastName}`);
        console.log('Email:', admin.email);
        console.log('Password:', adminPassword);
        console.log('Role: ADMIN');
      } else {
        console.log('ℹ️  Regular admin user already exists');
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDatabase;
