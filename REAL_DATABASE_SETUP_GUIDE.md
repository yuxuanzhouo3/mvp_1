# Real Database Setup Guide

## 🎉 Your Supabase Project is Ready!

Your Supabase project has been configured with the following credentials:
- **Project URL**: https://bamratexknmqvdbalzen.supabase.co
- **Project Region**: West US
- **Email**: mornscience@163.com

## 📋 Setup Steps

### 1. ✅ Environment Configuration (COMPLETED)
Your `.env.local` file has been created with your Supabase credentials. The app is now configured to use your real database instead of mock mode.

### 2. 🔧 Database Schema Setup

You have two options to set up the database schema:

#### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `bamratexknmqvdbalzen`
3. Navigate to **SQL Editor** in the left sidebar
4. Copy the entire contents of `scripts/setup-database.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute the script
7. You should see: "Database setup completed successfully! 🎉"

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref bamratexknmqvdbalzen

# Push the database schema
supabase db push
```

### 3. 🔑 Get Your Service Role Key (Optional but Recommended)
For full functionality, get your service role key:
1. Go to your Supabase dashboard
2. Navigate to **Settings** > **API**
3. Copy the **service_role** key (not the anon key)
4. Replace `your-service-role-key-here` in your `.env.local` file

### 4. 🚀 Restart Your Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### 5. 🧪 Test the Setup
1. Go to http://localhost:3002/auth/register
2. Try registering with your email: `mornscience@163.com`
3. Check if data appears in your Supabase dashboard under **Table Editor**

## 📊 What's Included in the Database Schema

The setup script creates the following tables:

- **profiles**: User profiles with personal information
- **matches**: Match records between users
- **user_likes**: User interactions (likes, passes, super likes)
- **chats**: Chat sessions between users
- **messages**: Individual messages in chats
- **transactions**: Credit and payment transactions
- **user_activities**: User activity logs
- **system_settings**: App configuration settings

Plus:
- ✅ Row Level Security (RLS) policies for data protection
- ✅ Automatic profile creation when users sign up
- ✅ Database indexes for performance
- ✅ Update timestamp triggers

## 🔐 Security Features

The database includes Row Level Security (RLS) policies that ensure:
- Users can only access their own data
- Users can only view chats they participate in
- Users can only see their own transactions and activities
- Proper authentication is required for all operations

## 🎯 Testing Your Setup

After completing the setup:

1. **Test Registration**: Try registering with `mornscience@163.com`
2. **Test Login**: Sign in with your registered account
3. **Test Dashboard**: Navigate to the dashboard and check if data loads
4. **Test Matching**: Try the matching feature to see if it works with real data
5. **Check Database**: Go to your Supabase dashboard > Table Editor to see the data

## 🚨 Important Notes

- **Mock Mode Disabled**: The app will no longer use mock data
- **Real Authentication**: Google OAuth and email/password auth will work with real Supabase
- **Data Persistence**: All data will be stored in your Supabase database
- **Backup**: Your data is automatically backed up by Supabase

## 🔧 Troubleshooting

### Connection Issues
If you see connection errors:
1. Verify your `.env.local` file exists and has correct credentials
2. Check if your Supabase project is active
3. Ensure you're not hitting rate limits

### Database Errors
If you see database errors:
1. Make sure you've run the SQL setup script
2. Check that RLS policies are properly configured
3. Verify table permissions

### Authentication Issues
If authentication doesn't work:
1. Check your service role key is correct
2. Verify Google OAuth is configured in Supabase Auth settings
3. Check browser console for errors

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Look at the terminal output for server errors
3. Verify your Supabase dashboard shows the correct data
4. Test the connection with: `node scripts/test-supabase-connection.js`

## 🎉 You're All Set!

Once you complete these steps, your PersonaLink app will be running with your real Supabase database, and you can:
- Register and login with real accounts
- Store user profiles and preferences
- Create matches and chat sessions
- Track user activities and transactions
- Scale your app with real data

Happy coding! 🚀 