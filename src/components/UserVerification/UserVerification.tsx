import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './UserVerification.css';

const UserVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [uniqueKey, setUniqueKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // In the handleVerify function or wherever verification is confirmed
const handleVerify = async () => {
  try {
    // Your verification logic here
    
    // If verification is successful
    sessionStorage.setItem('userVerified', 'true');
    
    // Get the return path from session storage or state
    const returnPath = location.state?.from || 
                      sessionStorage.getItem('returnPath') || 
                      '/dashboard';
    
    // Check if we should return to dashboard or stay on current view
    const returnToDashboard = location.state?.returnToDashboard !== false;
    
    if (returnToDashboard) {
      navigate('/dashboard');
    } else {
      // Navigate back to the exact path we came from
      navigate(returnPath);
    }
  } catch (error) {
    // Handle verification error
    console.error('Verification failed:', error);
  }
};

  // Get the intended destination from the state, default to dashboard for initial login
  const destination = location.state?.from || '/dashboard';
  
  // Determine if this is for password reset or viewing passwords
  const isPasswordReset = destination === '/reset-password';
  const isViewingPassword = sessionStorage.getItem('showPasswordForRow') !== null;

  useEffect(() => {
    // Get username from localStorage
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      navigate(isPasswordReset ? '/forgot-password' : '/');
      return;
    }
    setUsername(storedUsername);
  }, [navigate, isPasswordReset]);

  // When verification is successful
  // In the handleVerification function, update the navigation after successful verification
  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
  
    try {
      if (!username) {
        setError('Please provide your username first');
        return;
      }
  
      const response = await fetch('http://localhost:3000/api/login/verify', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, uniqueKey })
      });
  
      if (response.ok) {
        // Set userVerified flag with timestamp to ensure it's fresh
        sessionStorage.setItem('userVerified', 'true');
        sessionStorage.setItem('verificationTimestamp', Date.now().toString());
        
        // Check if we need to show a password
        const showPasswordForRow = location.state?.showPasswordForRow || 
                                  sessionStorage.getItem('showPasswordForRow');
        const tableName = location.state?.showTable || 
                         sessionStorage.getItem('tableName');
        
        if (showPasswordForRow && tableName) {
          // Store these in session storage for the TableDetails component
          sessionStorage.setItem('showPasswordForRow', showPasswordForRow);
          sessionStorage.setItem('tableName', tableName);
          sessionStorage.setItem('shouldShowPassword', 'true');
          
          // Navigate to dashboard with specific state to trigger password display
          navigate('/dashboard', { 
            state: { 
              showTable: tableName,
              verified: true,
              showPasswordForRow: showPasswordForRow,
              verifiedAt: Date.now() // Add timestamp to ensure state is fresh
            }
          });
        } else {
          // Get the intended destination from location state or default to dashboard
          const destinationPath = location.state?.from || '/dashboard';
          
          // Navigate to the intended destination after verification
          navigate(destinationPath, { 
            state: { 
              verified: true,
              verifiedAt: Date.now()
            } 
          });
        }
      } else {
        const data = await response.json();
        setError(data.message || 'Invalid unique key');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove the unused handleVerify function since it's redundant
  // Delete or comment out the entire handleVerify function

  return (
    <div className="verification-container">
      <div className="verification-box">
        <h2>Enter Your Unique Key</h2>
        <p className="verification-message">
          {isPasswordReset 
            ? "Please enter your unique key to reset your password"
            : isViewingPassword
              ? "Please enter your unique key to view the password"
              : "Please enter the Unique Key to access other Modules"}
        </p>
        
        <form onSubmit={handleVerification} className="verification-form">
          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              value={uniqueKey}
              onChange={(e) => {
                setUniqueKey(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your unique key"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              )}
            </button>
            {error && <div className="error-message">{error}</div>}
          </div>
          
          <div className="verification-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => {
                if (isPasswordReset) {
                  navigate('/forgot-password');
                } else if (isViewingPassword) {
                  // Clear session storage for password viewing
                  sessionStorage.removeItem('showPasswordForRow');
                  sessionStorage.removeItem('returnPath');
                  navigate('/dashboard');
                } else {
                  navigate('/');
                  localStorage.removeItem('username');
                }
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="verify-button"
              disabled={!uniqueKey || isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserVerification;


