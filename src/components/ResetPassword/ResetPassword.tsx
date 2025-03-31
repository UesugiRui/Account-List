import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResetPassword.css';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false
  });

  useEffect(() => {
    // Check if user is verified
    const isVerified = sessionStorage.getItem('userVerified') === 'true';
    if (!isVerified) {
      navigate('/forgot-password');
    }
  }, [navigate]);

  // Validate password as user types
  useEffect(() => {
    setValidationErrors({
      length: newPassword.length >= 8 && newPassword.length <= 16,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
      match: newPassword === confirmPassword && newPassword !== ''
    });
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check if all validation criteria are met
    const allValid = Object.values(validationErrors).every(value => value === true);
    if (!allValid) {
      setError('Please ensure your password meets all requirements');
      return;
    }

    setIsLoading(true);

    try {
      const username = localStorage.getItem('username');
      if (!username) {
        setError('Session expired. Please start over.');
        navigate('/forgot-password');
        return;
      }

      const response = await fetch('http://localhost:3000/api/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, newPassword })
      });

      const data = await response.json();
      
      if (data.success) {
        // Clear session data
        sessionStorage.removeItem('userVerified');
        localStorage.removeItem('username');
        
        // Redirect to login with success message
        navigate('/', { state: { message: 'Password reset successful. Please login with your new password.' } });
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <h2>Reset Your Password</h2>
        <p className="instruction-text">
          Create a new password that meets the following requirements
        </p>
        
        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="input-group">
            <label>New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="password-requirements">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={validationErrors.length ? 'valid' : 'invalid'}>
                8-16 characters
              </li>
              <li className={validationErrors.uppercase ? 'valid' : 'invalid'}>
                At least one uppercase letter
              </li>
              <li className={validationErrors.lowercase ? 'valid' : 'invalid'}>
                At least one lowercase letter
              </li>
              <li className={validationErrors.number ? 'valid' : 'invalid'}>
                At least one number
              </li>
              <li className={validationErrors.special ? 'valid' : 'invalid'}>
                At least one special character
              </li>
              <li className={validationErrors.match ? 'valid' : 'invalid'}>
                Passwords match
              </li>
            </ul>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => navigate('/forgot-password')}
            >
              Back
            </button>
            <button
              type="submit"
              className="reset-button"
              disabled={!newPassword || !confirmPassword || isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
