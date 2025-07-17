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
  Badge, 
  Navbar,
  ProgressBar,
  Alert,
  Spinner,
  Modal
} from 'react-bootstrap';
import { 
  Heart, 
  X, 
  ArrowLeft,
  Star,
  MapPin,
  User,
  MessageSquare
} from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

interface Candidate {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  age?: number;
  interests: string[];
  compatibility_score: number;
  industry?: string;
  communication_style?: string;
  personality_traits?: string[];
}

export default function MatchingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Candidate | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadCandidates();
  }, [user, authLoading]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/matching/candidates');
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (currentIndex >= candidates.length) return;
    
    const candidate = candidates[currentIndex];
    setMatching(true);
    
    try {
      // Simulate API call for like
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if it's a match (random for demo)
      const isMatch = Math.random() > 0.7;
      
      if (isMatch) {
        setMatchedUser(candidate);
        setShowMatchModal(true);
      }
      
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error liking candidate:', error);
    } finally {
      setMatching(false);
    }
  };

  const handlePass = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleStartChat = () => {
    if (matchedUser) {
      router.push(`/chat/${matchedUser.id}`);
    }
    setShowMatchModal(false);
  };

  const currentCandidate = candidates[currentIndex];

  if (authLoading || loading) {
    return (
      <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">加载匹配中...</p>
        </div>
      </Container>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="bg-light min-vh-100">
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
            
            <Navbar.Brand className="fw-bold text-primary">匹配</Navbar.Brand>
          </Container>
        </Navbar>

        <Container fluid className="py-5">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-5">
              <Heart size={48} className="text-muted mb-3" />
              <h5 className="text-muted mb-2">暂时没有更多推荐</h5>
              <p className="text-muted mb-3">请稍后再试或完善您的个人资料</p>
              <Button 
                variant="primary"
                onClick={() => router.push('/profile/edit')}
              >
                完善资料
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  if (currentIndex >= candidates.length) {
    return (
      <div className="bg-light min-vh-100">
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
            
            <Navbar.Brand className="fw-bold text-primary">匹配</Navbar.Brand>
          </Container>
        </Navbar>

        <Container fluid className="py-5">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-5">
              <Heart size={48} className="text-muted mb-3" />
              <h5 className="text-muted mb-2">已浏览完所有推荐</h5>
              <p className="text-muted mb-3">稍后会有更多推荐，或查看您的匹配历史</p>
              <div className="d-grid gap-2">
                <Button 
                  variant="primary"
                  onClick={() => window.location.reload()}
                >
                  刷新推荐
                </Button>
                <Button 
                  variant="outline-primary"
                  onClick={() => router.push('/matching/history')}
                >
                  查看历史
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
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
          
          <Navbar.Brand className="fw-bold text-primary">匹配</Navbar.Brand>
          
          <div className="ms-auto">
            <small className="text-muted">
              {currentIndex + 1} / {candidates.length}
            </small>
          </div>
        </Container>
      </Navbar>

      <Container fluid className="py-3">
        <Row>
          <Col>
            {/* Candidate Card */}
            <Card className="border-0 shadow-sm">
              <div className="position-relative">
                {/* Profile Image */}
                <div 
                  className="bg-primary d-flex align-items-center justify-content-center"
                  style={{ height: '300px' }}
                >
                  <div 
                    className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center"
                    style={{ width: '120px', height: '120px', fontSize: '48px' }}
                  >
                    {currentCandidate.full_name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                {/* Compatibility Score */}
                <div className="position-absolute top-0 end-0 m-3">
                  <Badge bg="success" className="fs-6">
                    {Math.round(currentCandidate.compatibility_score)}% 匹配
                  </Badge>
                </div>
              </div>

              <Card.Body>
                {/* Basic Info */}
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h4 className="mb-1">{currentCandidate.full_name}</h4>
                    {currentCandidate.age && (
                      <p className="text-muted mb-0">{currentCandidate.age} 岁</p>
                    )}
                  </div>
                  <Star size={20} className="text-warning" />
                </div>

                {/* Location */}
                {currentCandidate.location && (
                  <p className="text-muted small mb-2">
                    <MapPin size={14} className="me-1" />
                    {currentCandidate.location}
                  </p>
                )}

                {/* Bio */}
                {currentCandidate.bio && (
                  <p className="mb-3">{currentCandidate.bio}</p>
                )}

                {/* Interests */}
                {currentCandidate.interests && currentCandidate.interests.length > 0 && (
                  <div className="mb-3">
                    <h6 className="mb-2">兴趣爱好</h6>
                    <div>
                      {currentCandidate.interests.slice(0, 5).map((interest, index) => (
                        <Badge key={index} bg="secondary" className="me-1 mb-1">
                          {interest}
                        </Badge>
                      ))}
                      {currentCandidate.interests.length > 5 && (
                        <Badge bg="light" text="dark">
                          +{currentCandidate.interests.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Compatibility Progress */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">匹配度</small>
                    <small className="text-muted">{Math.round(currentCandidate.compatibility_score)}%</small>
                  </div>
                  <ProgressBar 
                    now={currentCandidate.compatibility_score} 
                    variant="success"
                  />
                </div>

                {/* Action Buttons */}
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-danger" 
                    size="lg"
                    className="flex-fill"
                    onClick={handlePass}
                    disabled={matching}
                  >
                    <X size={24} />
                  </Button>
                  <Button 
                    variant="success" 
                    size="lg"
                    className="flex-fill"
                    onClick={handleLike}
                    disabled={matching}
                  >
                    {matching ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <Heart size={24} />
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Match Modal */}
      <Modal show={showMatchModal} onHide={() => setShowMatchModal(false)} centered>
        <Modal.Body className="text-center py-4">
          <div className="mb-3">
            <Heart size={48} className="text-danger" />
          </div>
          <h4 className="mb-2">恭喜！你们匹配了！</h4>
          <p className="text-muted mb-3">
            你和 {matchedUser?.full_name} 很合拍，开始聊天吧！
          </p>
          <div className="d-grid gap-2">
            <Button 
              variant="primary"
              onClick={handleStartChat}
            >
              <MessageSquare size={16} className="me-2" />
              开始聊天
            </Button>
            <Button 
              variant="outline-secondary"
              onClick={() => setShowMatchModal(false)}
            >
              继续浏览
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
} 