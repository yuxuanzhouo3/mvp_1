const { createClient } = require('@supabase/supabase-js');

// 使用你的 Supabase 配置
const supabaseUrl = 'https://bamratexknmqvdbalzen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseOperations() {
  console.log('🧪 Testing Database Read/Write Operations...\n');

  try {
    // 1. 测试用户资料 CRUD 操作
    console.log('1. Testing Profiles CRUD operations...');
    
    // 创建测试用户资料
    const testProfile = {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com',
      bio: 'This is a test profile',
      age: 25,
      gender: 'male',
      location: 'New York',
      avatar_url: 'https://example.com/avatar.jpg'
    };

    // 注意：由于 RLS，我们需要使用 service role key 来绕过权限检查
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.log('⚠️  No service role key provided, skipping write tests');
    } else {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      
      // 插入测试数据
      const { data: insertData, error: insertError } = await adminSupabase
        .from('profiles')
        .insert(testProfile)
        .select()
        .single();

      if (insertError) {
        console.log(`❌ Insert failed: ${insertError.message}`);
      } else {
        console.log('✅ Profile insert successful');
        
        // 读取测试数据
        const { data: readData, error: readError } = await adminSupabase
          .from('profiles')
          .select('*')
          .eq('id', testProfile.id)
          .single();

        if (readError) {
          console.log(`❌ Read failed: ${readError.message}`);
        } else {
          console.log('✅ Profile read successful');
          
          // 更新测试数据
          const { data: updateData, error: updateError } = await adminSupabase
            .from('profiles')
            .update({ bio: 'Updated bio' })
            .eq('id', testProfile.id)
            .select()
            .single();

          if (updateError) {
            console.log(`❌ Update failed: ${updateError.message}`);
          } else {
            console.log('✅ Profile update successful');
          }
        }
      }
    }
    console.log('');

    // 2. 测试匹配系统
    console.log('2. Testing Matches operations...');
    
    const testMatch = {
      user1_id: 'user1-123',
      user2_id: 'user2-456',
      status: 'pending'
    };

    if (serviceRoleKey) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      
      const { data: matchData, error: matchError } = await adminSupabase
        .from('matches')
        .insert(testMatch)
        .select()
        .single();

      if (matchError) {
        console.log(`❌ Match insert failed: ${matchError.message}`);
      } else {
        console.log('✅ Match insert successful');
      }
    }
    console.log('');

    // 3. 测试聊天系统
    console.log('3. Testing Chat operations...');
    
    if (serviceRoleKey) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      
      // 创建聊天室
      const { data: chatRoomData, error: chatRoomError } = await adminSupabase
        .from('chat_rooms')
        .insert({
          match_id: 'test-match-123',
          name: 'Test Chat Room'
        })
        .select()
        .single();

      if (chatRoomError) {
        console.log(`❌ Chat room insert failed: ${chatRoomError.message}`);
      } else {
        console.log('✅ Chat room insert successful');
        
        // 创建消息
        const { data: messageData, error: messageError } = await adminSupabase
          .from('messages')
          .insert({
            chat_room_id: chatRoomData.id,
            sender_id: 'user1-123',
            content: 'Hello, this is a test message!',
            message_type: 'text'
          })
          .select()
          .single();

        if (messageError) {
          console.log(`❌ Message insert failed: ${messageError.message}`);
        } else {
          console.log('✅ Message insert successful');
        }
      }
    }
    console.log('');

    // 4. 测试支付系统
    console.log('4. Testing Payment operations...');
    
    if (serviceRoleKey) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      
      const { data: paymentData, error: paymentError } = await adminSupabase
        .from('payments')
        .insert({
          user_id: 'user1-123',
          amount: 10.00,
          currency: 'USD',
          payment_method: 'stripe',
          status: 'completed',
          description: 'Test payment'
        })
        .select()
        .single();

      if (paymentError) {
        console.log(`❌ Payment insert failed: ${paymentError.message}`);
      } else {
        console.log('✅ Payment insert successful');
        
        // 更新用户余额
        const { data: balanceData, error: balanceError } = await adminSupabase
          .from('user_balance')
          .upsert({
            user_id: 'user1-123',
            balance: 10.00,
            total_earned: 10.00
          })
          .select()
          .single();

        if (balanceError) {
          console.log(`❌ Balance update failed: ${balanceError.message}`);
        } else {
          console.log('✅ Balance update successful');
        }
      }
    }
    console.log('');

    // 5. 测试查询性能
    console.log('5. Testing Query Performance...');
    
    const startTime = Date.now();
    const { data: profiles, error: queryError } = await supabase
      .from('profiles')
      .select('id, username, age, location')
      .limit(10);

    const endTime = Date.now();
    const queryTime = endTime - startTime;

    if (queryError) {
      console.log(`❌ Query failed: ${queryError.message}`);
    } else {
      console.log(`✅ Query successful (${queryTime}ms)`);
      console.log(`   Found ${profiles?.length || 0} profiles`);
    }
    console.log('');

    // 6. 测试 RLS 策略
    console.log('6. Testing RLS Policies...');
    
    // 尝试读取所有用户资料（应该被 RLS 阻止）
    const { data: allProfiles, error: rlsError } = await supabase
      .from('profiles')
      .select('*');

    if (rlsError && rlsError.message.includes('policy')) {
      console.log('✅ RLS is working correctly (blocked unauthorized access)');
    } else if (rlsError) {
      console.log(`⚠️  RLS error: ${rlsError.message}`);
    } else {
      console.log('⚠️  RLS might not be properly configured');
    }
    console.log('');

    console.log('🎉 Database operations test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseOperations(); 