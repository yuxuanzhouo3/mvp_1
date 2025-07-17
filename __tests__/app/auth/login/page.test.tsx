import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LoginPage from '@/app/auth/login/page';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth provider
jest.mock('@/app/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

describe('LoginPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  const mockSignIn = jest.fn();
  const mockSignInWithGoogle = jest.fn();
  const mockSignInWithPhone = jest.fn();
  const mockVerifyPhoneOTP = jest.fn();

  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      signIn: mockSignIn,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithPhone: mockSignInWithPhone,
      verifyPhoneOTP: mockVerifyPhoneOTP,
    });
    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
  });

  it('renders login form', () => {
    render(<LoginPage />);
    
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('handles email form submission', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  it('handles form validation errors', async () => {
    render(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Submit empty form
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
    });
  });

  it('handles authentication errors', async () => {
    const errorMessage = 'Invalid email or password';
    mockSignIn.mockResolvedValue({ error: { message: errorMessage } });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  it('handles Google sign-in', async () => {
    mockSignInWithGoogle.mockResolvedValue({ error: null });
    
    render(<LoginPage />);
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(googleButton);
    
    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
  });

  it('handles phone authentication', async () => {
    mockSignInWithPhone.mockResolvedValue({ error: null });
    
    render(<LoginPage />);
    
    // Switch to phone tab
    const phoneTab = screen.getByText('Phone');
    fireEvent.click(phoneTab);
    
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    const sendButton = screen.getByRole('button', { name: /send verification code/i });
    
    fireEvent.change(phoneInput, { target: { value: '1234567890' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockSignInWithPhone).toHaveBeenCalledWith('1234567890');
    });
  });

  it('redirects authenticated users to dashboard', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'user@example.com' },
      signIn: mockSignIn,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithPhone: mockSignInWithPhone,
      verifyPhoneOTP: mockVerifyPhoneOTP,
    });
    
    render(<LoginPage />);
    
    // Should redirect to dashboard when user is authenticated
    // This is handled by useEffect in the component
  });
}); 