import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import LoginPage from '@/app/auth/login/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AuthProvider
jest.mock('@/app/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockSignIn = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup router mock
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    // Setup auth mock
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      user: null,
    });
  });

  it('should render login form', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('should redirect to dashboard when user is authenticated', async () => {
    const mockUser = {
      id: 'mock-user-id-123',
      email: 'test@personalink.ai',
      user_metadata: { full_name: 'Test User' },
    };
    
    // Start with no user
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      user: null,
    });
    
    const { rerender } = render(<LoginPage />);
    
    // Verify no redirect initially
    expect(mockPush).not.toHaveBeenCalled();
    
    // Update user to authenticated state
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      user: mockUser,
    });
    
    rerender(<LoginPage />);
    
    // Should redirect to dashboard
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should not redirect multiple times when user is authenticated', async () => {
    const mockUser = {
      id: 'mock-user-id-123',
      email: 'test@personalink.ai',
      user_metadata: { full_name: 'Test User' },
    };
    
    // Start with authenticated user
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      user: mockUser,
    });
    
    render(<LoginPage />);
    
    // Should redirect once
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
    
    // Should not redirect again
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('should handle form submission with valid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    // Fill form
    emailInput.setAttribute('value', 'test@personalink.ai');
    passwordInput.setAttribute('value', 'test123');
    
    // Submit form
    submitButton.click();
    
    // Should call signIn
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@personalink.ai', 'test123');
    });
  });

  it('should handle form submission with invalid credentials', async () => {
    const mockError = { message: 'Invalid email or password' };
    mockSignIn.mockResolvedValue({ error: mockError });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    // Fill form with invalid credentials
    emailInput.setAttribute('value', 'invalid@example.com');
    passwordInput.setAttribute('value', 'wrongpassword');
    
    // Submit form
    submitButton.click();
    
    // Should call signIn
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('invalid@example.com', 'wrongpassword');
    });
    
    // Should not redirect
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show test authentication button', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('🧪 Test Authentication')).toBeInTheDocument();
  });

  it('should handle test authentication button click', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    
    render(<LoginPage />);
    
    const testButton = screen.getByText('🧪 Test Authentication');
    testButton.click();
    
    // Should call signIn with test credentials
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@personalink.ai', 'test123');
    });
  });

  it('should reset redirect state when user logs out', async () => {
    const mockUser = {
      id: 'mock-user-id-123',
      email: 'test@personalink.ai',
      user_metadata: { full_name: 'Test User' },
    };
    
    // Start with authenticated user
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      user: mockUser,
    });
    
    const { rerender } = render(<LoginPage />);
    
    // Should redirect to dashboard
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
    
    // Clear the mock calls
    mockPush.mockClear();
    
    // Update to no user (logged out)
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      user: null,
    });
    
    rerender(<LoginPage />);
    
    // Should not redirect when user is null
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
}); 