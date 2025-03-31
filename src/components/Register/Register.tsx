import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uniqueKey, setUniqueKey] = useState('');
  const [confirmUniqueKey, setConfirmUniqueKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [uniqueKeyMatch, setUniqueKeyMatch] = useState<boolean | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const validatePassword = (password: string): string | null => {
    // Update password requirements state
    setPasswordRequirements({
      length: password.length >= 8 && password.length <= 16,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });

    if (password.length < 8 || password.length > 16) {
      return 'Password must be between 8 and 16 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
    
    // Check password match when password changes
    if (confirmPassword) {
      setPasswordMatch(newPassword === confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setPasswordMatch(newConfirmPassword === password);
  };

  const handleUniqueKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUniqueKey = e.target.value;
    setUniqueKey(newUniqueKey);
    
    // Check unique key match when unique key changes
    if (confirmUniqueKey) {
      setUniqueKeyMatch(newUniqueKey === confirmUniqueKey);
    }
  };

  const handleConfirmUniqueKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmUniqueKey = e.target.value;
    setConfirmUniqueKey(newConfirmUniqueKey);
    setUniqueKeyMatch(newConfirmUniqueKey === uniqueKey);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check if unique keys match
    if (uniqueKey !== confirmUniqueKey) {
      setError('Unique keys do not match');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, uniqueKey }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Registration successful! You can now login.');
        setError('');
        setShowPopup(true);
        
        // Reset form
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setUniqueKey('');
        setConfirmUniqueKey('');
        // Reset password requirements
        setPasswordRequirements({
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false
        });
        // Reset match states
        setPasswordMatch(null);
        setUniqueKeyMatch(null);

        // Navigate after popup is closed
        setTimeout(() => {
          setShowPopup(false);
          navigate('/', { replace: true });
        }, 2000);
      } else {
        setError(data.message);
        setSuccess('');
      }
    } catch (err) {
      setError('An error occurred during registration.');
      setSuccess('');
    }
  };

  return (
    <div className="minimalist-container">
      {showPopup && (
        <div className="modal-overlay">
          <div className="popup-notification">
            <div className="popup-content">
              <span className="success-icon">✓</span>
              <h3>Registration Complete!</h3>
              <p>You will be redirected to login...</p>
            </div>
          </div>
        </div>
      )}
      <div className="minimalist-content">
        <div className="minimalist-left">
          <h1>AccountList</h1>
          <p>Join us to manage your accounts efficiently and securely</p>
        </div>
        <div className="minimalist-right">
          <div className="minimalist-form-container">
            <h2>Create Account</h2>
            <form onSubmit={handleRegister} className="minimalist-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="minimalist-input"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="minimalist-input"
                  required
                />
                <div className="password-requirements">
                  <ul className="requirements-list">
                    <li className={passwordRequirements.length ? 'met' : 'unmet'}>
                      • 8-16 characters
                    </li>
                    <li className={passwordRequirements.uppercase ? 'met' : 'unmet'}>
                      • At least one uppercase letter
                    </li>
                    <li className={passwordRequirements.lowercase ? 'met' : 'unmet'}>
                      • At least one lowercase letter
                    </li>
                    <li className={passwordRequirements.number ? 'met' : 'unmet'}>
                      • At least one number
                    </li>
                    <li className={passwordRequirements.special ? 'met' : 'unmet'}>
                      • At least one special character
                    </li>
                  </ul>
                </div>
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className="minimalist-input"
                  required
                />
                {confirmPassword && (
                  <div className={`password-match-message ${passwordMatch ? 'match' : 'no-match'}`}>
                    {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Unique Key"
                  value={uniqueKey}
                  onChange={handleUniqueKeyChange}
                  className="minimalist-input"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Confirm Unique Key"
                  value={confirmUniqueKey}
                  onChange={handleConfirmUniqueKeyChange}
                  className="minimalist-input"
                  required
                />
                {confirmUniqueKey && (
                  <div className={`password-match-message ${uniqueKeyMatch ? 'match' : 'no-match'}`}>
                    {uniqueKeyMatch ? '✓ Unique keys match' : '✗ Unique keys do not match'}
                  </div>
                )}
              </div>
              <button type="submit" className="minimalist-button">
                Register
              </button>
              {error && <p className="error-message">{error}</p>}
              {success && <p className="success-message">{success}</p>}
            </form>
            <div className="minimalist-footer">
              <Link to="/" className="minimalist-link">Already have an account? Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 