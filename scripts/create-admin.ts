import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createInitialAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      return;
    }

    // Create initial admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@llmmux.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Initial admin user created successfully!');
    console.log('Username:', admin.username);
    console.log('Email:', admin.email);
    console.log('Password:', adminPassword);
    console.log('Role:', admin.role);
    console.log('\n🔐 Please change the default password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialAdmin();
