'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Badge, 
  Navbar, 
  Nav, 
  NavDropdown,
  Offcanvas,
  ListGroup,
  ProgressBar,
  Alert
} from 'react-bootstrap';
import { 
  Heart, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  CreditCard, 
  Plus, 
  Settings, 
  User, 
  MapPin,
  Bell,
  LogOut,
  Menu,
  Home
} from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  credits: number;
  bio?: string;
  location?: string;
  interests: string[];
  created_at: string;
}

interface RecentMatch {
  id: string;
  matched_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  compatibility_score: number;
  matched_at: string;
}

interface DashboardStats {
  totalMatches: number;
  totalMessages: number;
  activeChats: number;
  profileCompletion: number;
}

export default function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authSettled, setAuthSettled] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Load profile
      const profileRes = await fetch('/api/user/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }

      // Load recent matches
      const matchesRes = await fetch('/api/user/matches');
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        setRecentMatches(matchesData.slice(0, 5));
      }

      // Load stats
      const statsRes = await fetch('/api/user/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Dashboard useEffect - user:', !!user, 'user id:', user?.id, 'authLoading:', authLoading);
    
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    setAuthSettled(true);
    
    if (!user || !user.id) {
      console.log('❌ No user found in dashboard, redirecting to login');
      setProfile(null);
      setRecentMatches([]);
      setStats(null);
      setLoading(false);
      router.push('/auth/login');
      return;
    } else {
      console.log('✅ User authenticated, loading dashboard data');
      loadDashboardData();
    }
  }, [user, authLoading, authSettled]);

  if (loading || authLoading) {
    return (
      <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">加载中...</p>
        </div>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Alert variant="warning" className="text-center">
          <Alert.Heading>无法加载用户资料</Alert.Heading>
          <p>请稍后重试或联系客服。</p>
          <Button variant="outline-warning" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </Alert>
      </Container>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth/login';
      toast({
        title: '已退出登录',
        description: '期待您的再次光临！',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: '退出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleRechargeCredits = () => {
    router.push('/payment/recharge');
  };

  const handleStartMatching = () => {
    router.push('/matching');
  };

  const handleViewChats = () => {
    router.push('/chat');
  };

  return (
    <div className="bg-light min-vh-100">
      {/* Mobile Header */}
      <Navbar bg="white" expand="lg" className="shadow-sm border-bottom">
        <Container fluid>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowSidebar(true)}
            className="me-2"
          >
            <Menu size={20} />
          </Button>
          
          <Navbar.Brand className="fw-bold text-primary">PersonaLink</Navbar.Brand>
          
          <NavDropdown 
            title={
              <div className="d-flex align-items-center">
                <div 
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                  style={{ width: '32px', height: '32px', fontSize: '14px' }}
                >
                  {profile.full_name?.charAt(0).toUpperCase()}
                </div>
              </div>
            } 
            id="user-dropdown"
          >
            <NavDropdown.Item onClick={() => router.push('/dashboard/settings')}>
              <Settings size={16} className="me-2" />
              设置
            </NavDropdown.Item>
            <NavDropdown.Item onClick={() => router.push('/dashboard/notifications')}>
              <Bell size={16} className="me-2" />
              通知
            </NavDropdown.Item>
            <NavDropdown.Divider />
            <NavDropdown.Item onClick={handleSignOut} className="text-danger">
              <LogOut size={16} className="me-2" />
              退出登录
            </NavDropdown.Item>
          </NavDropdown>
        </Container>
      </Navbar>

      {/* Mobile Sidebar */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>PersonaLink</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ListGroup variant="flush">
            <ListGroup.Item action onClick={() => { router.push('/dashboard'); setShowSidebar(false); }}>
              <Home size={16} className="me-2" />
              首页
            </ListGroup.Item>
            <ListGroup.Item action onClick={() => { router.push('/chat'); setShowSidebar(false); }}>
              <MessageSquare size={16} className="me-2" />
              聊天
            </ListGroup.Item>
            <ListGroup.Item action onClick={() => { router.push('/matching'); setShowSidebar(false); }}>
              <Heart size={16} className="me-2" />
              匹配
            </ListGroup.Item>
            <ListGroup.Item action onClick={() => { router.push('/payment/recharge'); setShowSidebar(false); }}>
              <CreditCard size={16} className="me-2" />
              充值
            </ListGroup.Item>
            <ListGroup.Item action onClick={() => { router.push('/dashboard/settings'); setShowSidebar(false); }}>
              <Settings size={16} className="me-2" />
              设置
            </ListGroup.Item>
          </ListGroup>
        </Offcanvas.Body>
      </Offcanvas>

      <Container fluid className="py-3">
        {/* Welcome Section */}
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center">
                <h4 className="fw-bold text-primary mb-2">
                  欢迎回来，{profile.full_name}！
                </h4>
                <p className="text-muted mb-0">发现新的朋友，开始有趣的对话</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0">
                <h6 className="mb-0 fw-bold">快速操作</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col xs={6} className="mb-2">
                    <Button 
                      variant="primary" 
                      className="w-100"
                      onClick={handleStartMatching}
                    >
                      <Heart size={16} className="me-1" />
                      开始匹配
                    </Button>
                  </Col>
                  <Col xs={6} className="mb-2">
                    <Button 
                      variant="outline-primary" 
                      className="w-100"
                      onClick={handleViewChats}
                    >
                      <MessageSquare size={16} className="me-1" />
                      查看聊天
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Stats Cards */}
        {stats && (
          <Row className="mb-4">
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0">
                  <h6 className="mb-0 fw-bold">数据统计</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={6} className="mb-3">
                      <div className="text-center">
                        <div className="h4 text-primary mb-1">{stats.totalMatches}</div>
                        <small className="text-muted">总匹配数</small>
                      </div>
                    </Col>
                    <Col xs={6} className="mb-3">
                      <div className="text-center">
                        <div className="h4 text-success mb-1">{stats.totalMessages}</div>
                        <small className="text-muted">消息数量</small>
                      </div>
                    </Col>
                    <Col xs={6} className="mb-3">
                      <div className="text-center">
                        <div className="h4 text-info mb-1">{stats.activeChats}</div>
                        <small className="text-muted">活跃聊天</small>
                      </div>
                    </Col>
                    <Col xs={6} className="mb-3">
                      <div className="text-center">
                        <div className="h4 text-warning mb-1">{stats.profileCompletion}%</div>
                        <small className="text-muted">资料完整度</small>
                      </div>
                    </Col>
                  </Row>
                  <ProgressBar 
                    now={stats.profileCompletion} 
                    variant="warning" 
                    className="mt-2"
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Profile & Credits */}
        <Row className="mb-4">
          <Col xs={12} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0">
                <h6 className="mb-0 fw-bold">
                  <User size={16} className="me-2" />
                  个人资料
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <div 
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                    style={{ width: '48px', height: '48px', fontSize: '18px' }}
                  >
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h6 className="mb-1">{profile.full_name}</h6>
                    <small className="text-muted">{profile.email}</small>
                  </div>
                </div>
                {profile.location && (
                  <p className="text-muted small mb-2">
                    <MapPin size={14} className="me-1" />
                    {profile.location}
                  </p>
                )}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">兴趣爱好</small>
                    <div>
                      {profile.interests.slice(0, 3).map((interest, index) => (
                        <Badge key={index} bg="secondary" className="me-1">
                          {interest}
                        </Badge>
                      ))}
                      {profile.interests.length > 3 && (
                        <Badge bg="light" text="dark">
                          +{profile.interests.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="w-100"
                  onClick={() => router.push('/profile/edit')}
                >
                  编辑资料
                </Button>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0">
                <h6 className="mb-0 fw-bold">
                  <CreditCard size={16} className="me-2" />
                  积分余额
                </h6>
              </Card.Header>
              <Card.Body className="text-center">
                <div className="h2 text-primary mb-2">{profile.credits}</div>
                <p className="text-muted small mb-3">可用积分</p>
                <Button 
                  variant="success" 
                  className="w-100"
                  onClick={handleRechargeCredits}
                >
                  <Plus size={16} className="me-1" />
                  充值积分
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <Row>
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">
                    <Heart size={16} className="me-2" />
                    最近匹配
                  </h6>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 text-decoration-none"
                    onClick={() => router.push('/matching/history')}
                  >
                    查看全部
                  </Button>
                </Card.Header>
                <Card.Body className="p-0">
                  <ListGroup variant="flush">
                    {recentMatches.map((match) => (
                      <ListGroup.Item key={match.id} className="border-0">
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3"
                            style={{ width: '40px', height: '40px', fontSize: '14px' }}
                          >
                            {match.matched_user.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{match.matched_user.full_name}</h6>
                            <small className="text-muted">
                              匹配度: {match.compatibility_score}%
                            </small>
                          </div>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => router.push(`/chat/${match.id}`)}
                          >
                            聊天
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
} 