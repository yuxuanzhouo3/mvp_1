/**
 * 生成管理员密码哈希的脚本
 * 运行: node scripts/generate-admin-password.js
 */

const bcrypt = require('bcryptjs');

async function generatePasswordHash() {
  const password = 'Zyx!213416';
  const hash = await bcrypt.hash(password, 10);

  console.log('管理员密码哈希已生成:');
  console.log(hash);
  console.log('\n请将此哈希值更新到 supabase/migrations/create_admin_users.sql 文件中');
  console.log('\nSQL 语句:');
  console.log(`INSERT INTO admin_users (username, password_hash)`);
  console.log(`VALUES ('admin', '${hash}')`);
  console.log(`ON CONFLICT (username) DO UPDATE SET password_hash = '${hash}';`);
}

generatePasswordHash().catch(console.error);
