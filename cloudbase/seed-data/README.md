# 腾讯云文档型数据库初始化数据

本目录包含需要手动导入到腾讯云文档型数据库的初始化数据。

## 📋 集合清单

### 需要创建的集合（共 21 个）

#### 用户模块
| 集合名称 | 说明 | 初始数据 |
|---------|------|----------|
| `users` | 用户基础信息 | 无 |
| `user_profiles` | 用户详细资料 | 无 |
| `user_verifications` | 用户认证状态 | 无 |
| `user_photos` | 用户照片 | 无 |

#### 兴趣标签
| 集合名称 | 说明 | 初始数据 |
|---------|------|----------|
| `interests` | 兴趣标签配置 | ✅ interests.json |
| `users_interests_map` | 用户-兴趣关联 | 无 |

#### 匹配系统
| 集合名称 | 说明 | 初始数据 |
|---------|------|----------|
| `recommendations` | 推荐结果 | 无 |
| `swipes` | 用户互动记录 | 无 |
| `matches` | 匹配成功记录 | 无 |

#### 聊天系统（可选，CN 环境使用环信 IM）
| 集合名称 | 说明 | 初始数据 |
|---------|------|----------|
| `chat_rooms` | 聊天室 | 无 |
| `messages` | 消息记录 | 无 |
| `message_attachments` | 消息附件 | 无 |

#### 支付与积分
| 集合名称 | 说明 | 初始数据 |
|---------|------|----------|
| `payments` | 支付记录 | 无 |
| `transactions` | 交易流水 | 无 |

#### 会员与套餐
| 集合名称 | 说明 | 初始数据 |
|---------|------|----------|
| `credit_packages` | 积分套餐配置 | ✅ credit_packages.json |
| `membership_tiers` | 会员等级配置 | ✅ membership_tiers.json |
| `user_memberships` | 用户会员订阅 | 无 |
| `user_boosts` | 用户曝光加速 | 无 |

#### AI 功能
| 集合名称 | 说明 | 初始数据 |
|---------|------|----------|
| `ai_chat_sessions` | AI 对话会话 | 无 |
| `ai_usage_limits` | AI 使用限额 | 无 |
| `ai_usage_logs` | AI 使用日志 | 无 |

---

## 🔧 导入步骤

### 方法一：通过腾讯云控制台手动导入

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云开发 CloudBase** > 选择你的环境
3. 点击左侧菜单 **数据库**
4. 点击 **新建集合**，依次创建上述 21 个集合
5. 对于有初始数据的集合（`interests`、`credit_packages`、`membership_tiers`）：
   - 点击集合名称进入
   - 点击 **导入** 按钮
   - 选择对应的 JSON 文件
   - 确认导入

### 方法二：使用腾讯云 CLI

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 导入数据
tcb database import interests ./interests.json --env YOUR_ENV_ID
tcb database import credit_packages ./credit_packages.json --env YOUR_ENV_ID
tcb database import membership_tiers ./membership_tiers.json --env YOUR_ENV_ID
```

---

## 📝 字段说明

### interests 集合
```json
{
  "id": 1,                          // 兴趣 ID（数字）
  "category": "Sports & Fitness",   // 分类
  "name": "Running",                // 兴趣名称
  "icon_url": "🏃"                  // 图标（emoji）
}
```

### credit_packages 集合
```json
{
  "_id": "starter",                 // 套餐 ID
  "name_en": "Starter Pack",        // 英文名称
  "name_zh": "入门包",              // 中文名称
  "credits": 50,                    // 积分数量
  "price_usd": 1.39,               // 美元价格
  "price_cny": 9.99,               // 人民币价格
  "original_price_usd": null,      // 原价（美元）
  "original_price_cny": null,      // 原价（人民币）
  "discount_percent": 0,           // 折扣百分比
  "bonus_boost": 0,                // 赠送 Boost 次数
  "bonus_premium_days": 0,         // 赠送 Premium 天数
  "bonus_vip_days": 0,             // 赠送 VIP 天数
  "is_popular": false,             // 是否热门
  "is_best_value": false,          // 是否最划算
  "is_active": true,               // 是否启用
  "sort_order": 1                  // 排序
}
```

### membership_tiers 集合
```json
{
  "_id": "free",                    // 等级 ID
  "name_en": "Free",                // 英文名称
  "name_zh": "免费版",              // 中文名称
  "monthly_price_usd": 0.00,       // 月费（美元）
  "monthly_price_cny": 0.00,       // 月费（人民币）
  "monthly_credits": 0,            // 每月赠送积分
  "features": ["..."],             // 权益列表
  "unlimited_likes": false,        // 无限喜欢
  "can_see_who_likes_me": false,   // 查看谁喜欢我
  "priority_matching": false,      // 优先匹配
  "invisible_mode": false,         // 隐身模式
  "change_location": false,        // 修改定位
  "no_ads": false,                 // 去广告
  "vip_support": false,            // VIP 客服
  "is_active": true,               // 是否启用
  "sort_order": 1                  // 排序
}
```

---

## ⚠️ 注意事项

1. **集合名称区分大小写**，请确保使用小写和下划线格式
2. `_id` 字段是 MongoDB 的主键，导入时会自动识别
3. 日期字段使用 ISO 8601 格式字符串
4. 导入前请确保集合已创建且为空
5. CN 环境聊天功能主要使用环信 IM，`chat_rooms`、`messages`、`message_attachments` 可选创建














