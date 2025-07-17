'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  ListGroup, 
  Badge, 
  Navbar,
  Form,
  InputGroup,
  Alert,
  Spinner
} from 'react-bootstrap';
import { 
  MessageSquare, 
  Search, 
  ArrowLeft,
  Send,
  User,
  Clock
} from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

interface ChatPreview {
  id: string;
  matched_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
  updated_at: string;
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadChats();
  }, [user, authLoading]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chat/list');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const filteredChats = chats.filter(chat =>
    chat.matched_user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">加载中...</p>
        </div>
      </Container>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      {/* Mobile Header */}
      <Navbar bg="white" className="shadow-sm border-bottom">
        <Container fluid>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleBackToDashboard}
            className="me-2"
          >
            <ArrowLeft size={20} />
          </Button>
          
          <Navbar.Brand className="fw-bold text-primary">聊天</Navbar.Brand>
        </Container>
      </Navbar>

      <Container fluid className="py-3">
        {/* Search Bar */}
        <Row className="mb-3">
          <Col>
            <InputGroup>
              <InputGroup.Text>
                <Search size={16} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="搜索聊天..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
        </Row>

        {/* Chat List */}
        <Row>
          <Col>
            {filteredChats.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-5">
                  <MessageSquare size={48} className="text-muted mb-3" />
                  <h5 className="text-muted mb-2">
                    {searchTerm ? '没有找到匹配的聊天' : '还没有聊天'}
                  </h5>
                  <p className="text-muted mb-3">
                    {searchTerm 
                      ? '尝试使用不同的搜索词' 
                      : '开始匹配来找到新的朋友'
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      variant="primary"
                      onClick={() => router.push('/matching')}
                    >
                      开始匹配
                    </Button>
                  )}
                </Card.Body>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                  <ListGroup variant="flush">
                    {filteredChats.map((chat) => (
                      <ListGroup.Item 
                        key={chat.id} 
                        action
                        onClick={() => router.push(`/chat/${chat.id}`)}
                        className="border-0 py-3"
                      >
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                            style={{ width: '48px', height: '48px', fontSize: '18px' }}
                          >
                            {chat.matched_user.full_name?.charAt(0).toUpperCase()}
                          </div>
                          
                          <div className="flex-grow-1 min-w-0">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <h6 className="mb-0 text-truncate">
                                {chat.matched_user.full_name}
                              </h6>
                              <small className="text-muted ms-2">
                                {new Date(chat.updated_at).toLocaleDateString()}
                              </small>
                            </div>
                            
                            {chat.last_message ? (
                              <div className="d-flex justify-content-between align-items-center">
                                <p className="text-muted small mb-0 text-truncate me-2">
                                  {chat.last_message.sender_id === user?.id ? '你: ' : ''}
                                  {chat.last_message.content}
                                </p>
                                {chat.unread_count > 0 && (
                                  <Badge bg="danger" className="ms-auto">
                                    {chat.unread_count}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <p className="text-muted small mb-0">
                                开始新的对话
                              </p>
                            )}
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
} 