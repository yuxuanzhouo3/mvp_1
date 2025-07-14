const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DatabaseRecoverySystem {
  constructor() {
    this.config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      currentAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      currentServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      backupKeys: [], // 备用 API keys
      healthCheckInterval: 3600000, // 1小时
      keyRotationInterval: 2592000000, // 30天
      alertThreshold: 0.1, // 10% 错误率阈值
      maxRetries: 3
    };
    
    this.healthHistory = [];
    this.lastKeyRotation = new Date();
    this.isRecoveryMode = false;
  }

  async initialize() {
    console.log('🚀 Initializing Database Recovery System...');
    
    // 加载备用 keys
    await this.loadBackupKeys();
    
    // 启动健康监控
    this.startHealthMonitoring();
    
    // 启动 API key 轮换
    this.startKeyRotation();
    
    console.log('✅ Database Recovery System initialized');
  }

  async loadBackupKeys() {
    try {
      const backupKeysPath = path.join(process.cwd(), '.backup-keys.json');
      if (fs.existsSync(backupKeysPath)) {
        const backupData = JSON.parse(fs.readFileSync(backupKeysPath, 'utf8'));
        this.config.backupKeys = backupData.keys || [];
        console.log(`📦 Loaded ${this.config.backupKeys.length} backup keys`);
      }
    } catch (error) {
      console.warn('⚠️  Could not load backup keys:', error.message);
    }
  }

  async saveBackupKeys() {
    try {
      const backupKeysPath = path.join(process.cwd(), '.backup-keys.json');
      const backupData = {
        keys: this.config.backupKeys,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(backupKeysPath, JSON.stringify(backupData, null, 2));
    } catch (error) {
      console.error('❌ Failed to save backup keys:', error.message);
    }
  }

  startHealthMonitoring() {
    setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    console.log(`🔍 Health monitoring started (${this.config.healthCheckInterval / 1000}s interval)`);
  }

  startKeyRotation() {
    setInterval(async () => {
      await this.rotateApiKeys();
    }, this.config.keyRotationInterval);
    
    console.log(`🔄 API key rotation scheduled (${this.config.keyRotationInterval / 1000 / 60 / 60 / 24} days interval)`);
  }

  async performHealthCheck() {
    console.log('🔍 Performing health check...');
    
    const healthCheck = {
      timestamp: new Date(),
      status: 'unknown',
      responseTime: 0,
      errorRate: 0,
      details: {}
    };

    try {
      const startTime = Date.now();
      
      // 测试当前连接
      const supabase = createClient(this.config.supabaseUrl, this.config.currentServiceKey);
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      healthCheck.responseTime = Date.now() - startTime;
      
      if (error) {
        healthCheck.status = 'unhealthy';
        healthCheck.details.error = error.message;
        await this.handleHealthFailure(healthCheck);
      } else {
        healthCheck.status = 'healthy';
        await this.handleHealthSuccess(healthCheck);
      }
      
    } catch (error) {
      healthCheck.status = 'unhealthy';
      healthCheck.details.error = error.message;
      await this.handleHealthFailure(healthCheck);
    }

    // 保存健康历史
    this.healthHistory.push(healthCheck);
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }

    // 计算错误率
    const recentChecks = this.healthHistory.slice(-10);
    const failedChecks = recentChecks.filter(check => check.status === 'unhealthy').length;
    healthCheck.errorRate = failedChecks / recentChecks.length;

    console.log(`📊 Health check result: ${healthCheck.status} (${healthCheck.responseTime}ms, ${(healthCheck.errorRate * 100).toFixed(1)}% error rate)`);
  }

  async handleHealthFailure(healthCheck) {
    console.warn('⚠️  Health check failed:', healthCheck.details.error);
    
    // 如果错误率超过阈值，尝试恢复
    if (healthCheck.errorRate > this.config.alertThreshold) {
      await this.attemptRecovery();
    }
    
    // 发送告警
    await this.sendAlert('health_failure', healthCheck);
  }

  async handleHealthSuccess(healthCheck) {
    if (this.isRecoveryMode) {
      console.log('🟢 Recovery successful - exiting recovery mode');
      this.isRecoveryMode = false;
      await this.sendAlert('recovery_success', healthCheck);
    }
  }

  async attemptRecovery() {
    if (this.isRecoveryMode) {
      console.log('🔄 Already in recovery mode, skipping...');
      return;
    }

    console.log('🚨 Starting recovery process...');
    this.isRecoveryMode = true;

    try {
      // 1. 尝试重置连接
      await this.resetConnection();
      
      // 2. 如果失败，尝试备用 API keys
      if (!await this.testCurrentConnection()) {
        await this.tryBackupKeys();
      }
      
      // 3. 如果还是失败，尝试故障转移
      if (!await this.testCurrentConnection()) {
        await this.performFailover();
      }
      
    } catch (error) {
      console.error('❌ Recovery failed:', error.message);
      await this.sendAlert('recovery_failed', { error: error.message });
    }
  }

  async resetConnection() {
    console.log('🔄 Attempting connection reset...');
    
    // 这里可以添加连接重置逻辑
    // 比如重新初始化 Supabase 客户端
    
    await this.sleep(5000); // 等待5秒
  }

  async testCurrentConnection() {
    try {
      const supabase = createClient(this.config.supabaseUrl, this.config.currentServiceKey);
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  }

  async tryBackupKeys() {
    console.log('🔑 Trying backup API keys...');
    
    for (let i = 0; i < this.config.backupKeys.length; i++) {
      const backupKey = this.config.backupKeys[i];
      
      try {
        const supabase = createClient(this.config.supabaseUrl, backupKey);
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        
        if (!error) {
          console.log(`✅ Backup key ${i + 1} works, switching...`);
          this.config.currentServiceKey = backupKey;
          await this.updateEnvironmentVariables();
          return true;
        }
      } catch (error) {
        console.log(`❌ Backup key ${i + 1} failed`);
      }
    }
    
    return false;
  }

  async performFailover() {
    console.log('🔄 Performing failover to replica database...');
    
    // 这里可以实现故障转移到备用数据库的逻辑
    // 比如切换到不同的 Supabase 项目或数据库实例
    
    await this.sendAlert('failover_triggered', { 
      message: 'Switching to replica database' 
    });
  }

  async rotateApiKeys() {
    console.log('🔄 Starting API key rotation...');
    
    try {
      // 生成新的 API key
      const newKey = await this.generateNewApiKey();
      
      // 测试新 key
      const supabase = createClient(this.config.supabaseUrl, newKey);
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (!error) {
        // 将当前 key 添加到备用列表
        this.config.backupKeys.push(this.config.currentServiceKey);
        
        // 更新当前 key
        this.config.currentServiceKey = newKey;
        
        // 更新环境变量
        await this.updateEnvironmentVariables();
        
        // 保存备用 keys
        await this.saveBackupKeys();
        
        this.lastKeyRotation = new Date();
        
        console.log('✅ API key rotation completed');
        await this.sendAlert('key_rotation_success', { 
          newKeyId: this.getKeyId(newKey) 
        });
      } else {
        throw new Error('New API key test failed');
      }
      
    } catch (error) {
      console.error('❌ API key rotation failed:', error.message);
      await this.sendAlert('key_rotation_failed', { error: error.message });
    }
  }

  async generateNewApiKey() {
    // 这里应该调用 Supabase API 生成新的 key
    // 现在使用模拟的 key
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${crypto.randomBytes(32).toString('base64')}`;
  }

  getKeyId(key) {
    // 从 JWT token 中提取 key ID
    try {
      const parts = key.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.kid || 'unknown';
      }
    } catch (error) {
      // 忽略解析错误
    }
    return 'unknown';
  }

  async updateEnvironmentVariables() {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      let content = fs.readFileSync(envPath, 'utf8');
      
      // 更新 service role key
      content = content.replace(
        /SUPABASE_SERVICE_ROLE_KEY=.*/,
        `SUPABASE_SERVICE_ROLE_KEY=${this.config.currentServiceKey}`
      );
      
      fs.writeFileSync(envPath, content);
      console.log('✅ Environment variables updated');
      
    } catch (error) {
      console.error('❌ Failed to update environment variables:', error.message);
    }
  }

  async sendAlert(type, data) {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      data,
      system: 'database_recovery'
    };
    
    console.log(`🚨 Alert: ${type}`, data);
    
    // 这里可以集成实际的告警系统
    // 比如发送邮件、Slack 消息、SMS 等
    
    // 保存告警日志
    await this.saveAlertLog(alert);
  }

  async saveAlertLog(alert) {
    try {
      const logPath = path.join(process.cwd(), 'logs', 'alerts.json');
      
      // 确保日志目录存在
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // 读取现有日志
      let alerts = [];
      if (fs.existsSync(logPath)) {
        alerts = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      }
      
      // 添加新告警
      alerts.push(alert);
      
      // 保持日志大小限制
      if (alerts.length > 1000) {
        alerts = alerts.slice(-1000);
      }
      
      fs.writeFileSync(logPath, JSON.stringify(alerts, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to save alert log:', error.message);
    }
  }

  getStatus() {
    return {
      isRecoveryMode: this.isRecoveryMode,
      lastKeyRotation: this.lastKeyRotation,
      healthHistory: this.healthHistory.slice(-10),
      backupKeysCount: this.config.backupKeys.length,
      currentErrorRate: this.healthHistory.length > 0 
        ? this.healthHistory.slice(-10).filter(h => h.status === 'unhealthy').length / 10 
        : 0
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建恢复系统实例
const recoverySystem = new DatabaseRecoverySystem();

// 启动恢复系统
async function main() {
  try {
    await recoverySystem.initialize();
    
    // 保持进程运行
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Database Recovery System...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize recovery system:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { DatabaseRecoverySystem, recoverySystem }; 