'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  TrendingUp, 
  Shield, 
  Activity,
  Eye,
  Ban,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  credits: number;
  is_banned: boolean;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  chat_id: string;
  created_at: string;
}

interface MatchStats {
  totalMatches: number;
  successfulMatches: number;
  averageScore: number;
  topInterests: string[];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
  const isAdmin = user && adminEmails.includes(user.email || '');

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page',
        variant: 'destructive',
      });
      return;
    }

    loadDashboardData();
  }, [isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadTransactions(),
        loadChatMessages(),
        loadMatchStats(),
      ]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const response = await fetch('/api/ops/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users);
    }
  };

  const loadTransactions = async () => {
    const response = await fetch('/api/ops/payments');
    if (response.ok) {
      const data = await response.json();
      setTransactions(data.transactions);
    }
  };

  const loadChatMessages = async () => {
    const response = await fetch('/api/ops/chats');
    if (response.ok) {
      const data = await response.json();
      setChatMessages(data.messages);
    }
  };

  const loadMatchStats = async () => {
    const response = await fetch('/api/ops/match-stats');
    if (response.ok) {
      const data = await response.json();
      setMatchStats(data.stats);
    }
  };

  const banUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/ops/users/${userId}/ban`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: 'User banned',
          description: 'User has been banned successfully',
        });
        loadUsers();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to ban user',
        variant: 'destructive',
      });
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/ops/users/${userId}/unban`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: 'User unbanned',
          description: 'User has been unbanned successfully',
        });
        loadUsers();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unban user',
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage users, monitor payments, and view analytics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                {users.filter(u => !u.is_banned).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${transactions
                  .filter(t => t.status === 'succeeded')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {transactions.filter(t => t.status === 'succeeded').length} successful payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chatMessages.length}</div>
              <p className="text-xs text-muted-foreground">
                {chatMessages.filter(m => m.content.includes('AI')).length} AI responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {matchStats ? `${(matchStats.successfulMatches / matchStats.totalMatches * 100).toFixed(1)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                {matchStats?.successfulMatches || 0} successful matches
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="chats">Chats</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{user.full_name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Credits: {user.credits} | Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.is_banned && (
                          <Badge variant="destructive">Banned</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => user.is_banned ? unbanUser(user.id) : banUser(user.id)}
                        >
                          {user.is_banned ? <Shield className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Transactions</CardTitle>
                <CardDescription>
                  Monitor payment activity and revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">${transaction.amount} {transaction.currency.toUpperCase()}</h3>
                        <p className="text-sm text-gray-600">{transaction.payment_method}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={transaction.status === 'succeeded' ? 'default' : 'secondary'}>
                        {transaction.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Chat Messages</CardTitle>
                <CardDescription>
                  Monitor chat activity and AI responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chatMessages.slice(0, 20).map((message) => (
                    <div key={message.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">User: {message.sender_id}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{message.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Matching Analytics</CardTitle>
                <CardDescription>
                  View matching performance and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matchStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium">Total Matches</h3>
                        <p className="text-2xl font-bold">{matchStats.totalMatches}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium">Success Rate</h3>
                        <p className="text-2xl font-bold">
                          {((matchStats.successfulMatches / matchStats.totalMatches) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">Top Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {matchStats.topInterests.map((interest, index) => (
                          <Badge key={index} variant="outline">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 