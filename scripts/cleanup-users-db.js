/**
 * 清理 users 集合中的冗余数据
 *
 * 使用方法：
 * node scripts/cleanup-users-db.js
 *
 * 功能：
 * 1. 删除只有 created_at 和 updated_at 的空记录
 * 2. 为微信登录用户补充缺失的 id 字段
 */

// 首先加载环境变量
require('dotenv').config({ path: '.env.local' });

const cloudbase = require('@cloudbase/node-sdk');

// 检查环境变量是否加载成功
console.log('环境变量检查:');
console.log('- CLOUDBASE_ENV_ID:', process.env.CLOUDBASE_ENV_ID || '未设置');
console.log('- NEXT_PUBLIC_CLOUDBASE_ENV_ID:', process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '未设置');
console.log('- CLOUDBASE_SECRET_ID:', process.env.CLOUDBASE_SECRET_ID ? '已设置' : '未设置');
console.log('- CLOUDBASE_SECRET_KEY:', process.env.CLOUDBASE_SECRET_KEY ? '已设置' : '未设置');

// 初始化 Cloudbase
const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
const secretId = process.env.CLOUDBASE_SECRET_ID;
const secretKey = process.env.CLOUDBASE_SECRET_KEY;

if (!envId || !secretId || !secretKey) {
  console.error('\n❌ 错误：缺少必要的环境变量！');
  console.error('请确保 .env.local 文件中包含以下配置：');
  console.error('CLOUDBASE_ENV_ID=你的环境ID');
  console.error('CLOUDBASE_SECRET_ID=你的SecretId');
  console.error('CLOUDBASE_SECRET_KEY=你的SecretKey');
  process.exit(1);
}

const app = cloudbase.init({
  env: envId,
  secretId: secretId,
  secretKey: secretKey,
});

const db = app.database();
const _ = db.command;

async function cleanupUsersCollection() {
  console.log('\n开始清理 users 集合...\n');

  try {
    // 1. 查找所有用户记录
    const { data: allUsers } = await db.collection('users').get();
    console.log(`总共找到 ${allUsers.length} 条用户记录\n`);

    let emptyRecordsCount = 0;
    let fixedWeChatUsersCount = 0;
    const emptyRecordIds = [];
    const wechatUsersToFix = [];

    // 2. 分析每条记录
    for (const user of allUsers) {
      const keys = Object.keys(user).filter(k => !['_id', 'created_at', 'updated_at'].includes(k));

      // 检查是否为空记录（只有 _id, created_at, updated_at）
      if (keys.length === 0) {
        emptyRecordsCount++;
        emptyRecordIds.push(user._id);
        console.log(`发现空记录: _id=${user._id}`);
      }
      // 检查微信用户是否缺少 id 字段
      else if (user.wechat_openid && !user.id) {
        wechatUsersToFix.push(user);
        console.log(`发现缺少id的微信用户: _id=${user._id}, openid=${user.wechat_openid}`);
      }
    }

    console.log(`\n统计结果:`);
    console.log(`- 空记录数量: ${emptyRecordsCount}`);
    console.log(`- 需要修复的微信用户: ${wechatUsersToFix.length}\n`);

    // 3. 删除空记录
    if (emptyRecordIds.length > 0) {
      console.log(`开始删除 ${emptyRecordIds.length} 条空记录...`);
      for (const id of emptyRecordIds) {
        await db.collection('users').doc(id).remove();
        console.log(`已删除: ${id}`);
      }
      console.log(`✓ 成功删除 ${emptyRecordIds.length} 条空记录\n`);
    }

    // 4. 为微信用户补充 id 字段
    if (wechatUsersToFix.length > 0) {
      console.log(`开始为 ${wechatUsersToFix.length} 个微信用户补充 id 字段...`);
      for (const user of wechatUsersToFix) {
        // 使用 _id 作为 id（保持一致性）
        const userId = user._id;
        await db.collection('users').doc(user._id).update({
          id: userId,
          updated_at: new Date().toISOString(),
        });
        console.log(`已修复: _id=${user._id}, 新id=${userId}`);
        fixedWeChatUsersCount++;
      }
      console.log(`✓ 成功修复 ${fixedWeChatUsersCount} 个微信用户\n`);
    }

    // 5. 验证清理结果
    const { data: remainingUsers } = await db.collection('users').get();
    console.log(`\n清理完成！`);
    console.log(`- 清理前记录数: ${allUsers.length}`);
    console.log(`- 清理后记录数: ${remainingUsers.length}`);
    console.log(`- 删除的空记录: ${emptyRecordsCount}`);
    console.log(`- 修复的微信用户: ${fixedWeChatUsersCount}`);

    // 6. 检查是否还有问题
    let hasIssues = false;
    for (const user of remainingUsers) {
      const keys = Object.keys(user).filter(k => !['_id', 'created_at', 'updated_at'].includes(k));
      if (keys.length === 0) {
        console.log(`⚠️ 警告: 仍存在空记录 _id=${user._id}`);
        hasIssues = true;
      }
      if (user.wechat_openid && !user.id) {
        console.log(`⚠️ 警告: 微信用户仍缺少id字段 _id=${user._id}`);
        hasIssues = true;
      }
    }

    if (!hasIssues) {
      console.log('\n✓ 所有问题已解决！');
    }

  } catch (error) {
    console.error('清理过程中出错:', error);
    throw error;
  }
}

// 执行清理
cleanupUsersCollection()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });