import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TableDetails.css';

interface TableDetailsProps {
  tableName: string;
  onClose: () => void;
}

interface TableRow {
  id: number;
  username: string;
  passkey: string;
  description: string;
  created_at: string;
}

const TableDetails: React.FC<TableDetailsProps> = ({ tableName, onClose }) => {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
  const [decryptedPasswords, setDecryptedPasswords] = useState<{ [key: number]: string }>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const username = localStorage.getItem('username');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Update the useEffect to properly handle verification and cleanup
  useEffect(() => {
    fetchTableData();
  }, [tableName]); // Only run when tableName changes
  
  // Separate useEffect for handling password display after verification
  useEffect(() => {
    // Check if returning from verification
    const userVerified = sessionStorage.getItem('userVerified');
    const rowToShow = sessionStorage.getItem('showPasswordForRow');
    
    // Check if we should show a password and we have rows data
    if (userVerified === 'true' && rows.length > 0) {
      // If rowToShow is null, check if we have it in the location state
      let rowId: number | null = null;
      
      if (rowToShow) {
        rowId = parseInt(rowToShow);
      } else if (location.state && location.state.showPasswordForRow) {
        rowId = parseInt(location.state.showPasswordForRow);
      }
      
      if (!rowId) {
        return;
      }
      
      // Try direct fetch with the most likely endpoint
      fetch(`http://localhost:3000/api/tables/${tableName}/decrypt/${rowId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to decrypt: ${response.status}`);
        }
        return response.text();
      })
      .then(responseText => {
        let data;
        try {
          // Try to parse as JSON
          data = JSON.parse(responseText);
        } catch (e) {
          // If not JSON, use the raw text
          data = responseText;
        }
        
        // Extract password from response (handle different response formats)
        let password = null;
        
        if (typeof data === 'object' && data !== null) {
          password = data.password || data.decryptedPassword || data.passkey;
        } else if (typeof data === 'string') {
          password = data;
        }
        
        if (password) {
          // Show the decrypted password
          setDecryptedPasswords(prev => ({
            ...prev,
            [rowId!]: password
          }));
          
          setShowPasswords(prev => ({
            ...prev,
            [rowId!]: true
          }));
          
          // Clear session storage
          sessionStorage.removeItem('userVerified');
          sessionStorage.removeItem('showPasswordForRow');
          sessionStorage.removeItem('tableName');
          sessionStorage.removeItem('shouldShowPassword');
        }
      })
      .catch(error => {
        // Error handling without console logs
      });
    }
  }, [rows, tableName, location.state]);
  
  // Remove the client-side decryptPassword function as we're using server-side decryption
  // const decryptPassword = (encryptedPassword: string): string => { ... }
  const fetchTableData = async () => {
    if (!tableName) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3000/api/account/table/${tableName}/accounts`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch ${tableName} data`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Expected array of rows but got ' + typeof data);
      }
      
      const transformedData = data.map(row => ({
        id: row.id,
        username: row.username,
        passkey: row.passkey,
        description: row.description || '',
        created_at: row.created_at
      }));
      
      setRows(transformedData);
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load table data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Extract time from ISO string (assuming format like "2025-03-30T23:58:19.973Z")
      const timePart = dateString.split('T')[1].substring(0, 5); // Get HH:MM
      const hour = parseInt(timePart.split(':')[0]);
      const minute = timePart.split(':')[1];
      
      // Format to 12-hour with AM/PM without conversion
      const hour12 = hour % 12 || 12; // Convert 0 to 12
      const ampm = hour >= 12 ? 'PM' : 'AM';
      
      // Get date part
      const datePart = dateString.split('T')[0]; // YYYY-MM-DD
      const [year, month, day] = datePart.split('-');
      
      return `${month}/${day}/${year}, ${hour12}:${minute} ${ampm}`;
    } catch (err) {
      return dateString;
    }
  };

  // Update the fetchDecryptedPassword function to include proper authentication
  // Update the fetchDecryptedPassword function to try multiple endpoint formats
  const fetchDecryptedPassword = async (rowId: number) => {
    try {
      console.log(`Fetching password for ${tableName}, row ${rowId}`);
      
      // Try multiple endpoint formats to find the one that works
      const endpoints = [
        `http://localhost:3000/api/tables/${tableName}/decrypt/${rowId}`,
        `http://localhost:3000/api/account/decrypt-password/${tableName}/${rowId}`,
        `http://localhost:3000/api/account/table/${tableName}/decrypt/${rowId}`,
        `http://localhost:3000/api/account/password/decrypt/${tableName}/${rowId}`
      ];
      
      let response = null;
      let endpointUsed = '';
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        console.log(`Trying endpoint: ${endpoint}`);
        
        try {
          const resp = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`Endpoint ${endpoint} status:`, resp.status);
          
          if (resp.ok) {
            response = resp;
            endpointUsed = endpoint;
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed:`, err);
        }
      }
      
      if (!response) {
        throw new Error('All endpoints failed');
      }
      
      console.log(`Successfully used endpoint: ${endpointUsed}`);
      
      // Parse the successful response
      const data = await response.json();
      console.log('Decryption response data:', data);
      
      // Check different possible response formats
      if (data.password) {
        return data.password;
      } else if (data.decryptedPassword) {
        return data.decryptedPassword;
      } else if (data.passkey) {
        return data.passkey;
      } else if (typeof data === 'string') {
        return data;
      } else {
        console.error('No password in response data:', data);
        return null;
      }
    } catch (error) {
      console.error('Error decrypting password:', error);
      
      // If all endpoints fail, redirect to verification
      navigate('/user-verification', {
        state: { 
          from: '/dashboard',
          showTable: tableName,
          showPasswordForRow: rowId.toString()
        }
      });
      
      return null;
    }
  };

  // Update the handleTogglePassword function to use the user-verification route
  // Update the handleTogglePassword function
  const handleTogglePassword = (rowId: number) => {
    if (showPasswords[rowId]) {
      // If password is already showing, just hide it
      setShowPasswords(prev => ({
        ...prev,
        [rowId]: false
      }));
    } else {
      // Always go through verification before showing passwords
      // Store the row ID to show password for after verification
      sessionStorage.setItem('showPasswordForRow', rowId.toString());
      sessionStorage.setItem('tableName', tableName);
      sessionStorage.setItem('shouldShowPassword', 'true');
      
      // Navigate to user verification with return information
      navigate('/user-verification', {
        state: { 
          from: '/dashboard',
          showTable: tableName,
          showPasswordForRow: rowId.toString()
        }
      });
    }
  };

  const copyToClipboard = (text: string, type: 'username' | 'password') => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show toast notification
        setToastMessage(`${type === 'username' ? 'Username' : 'Password'} copied to clipboard!`);
        setShowToast(true);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
        // Show error toast
        setToastMessage('Failed to copy text');
        setShowToast(true);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
      });
  };

  return (
    <div className="table-details-overlay">
      <div className="table-details-content">
        <div className="table-details-header">
          <h2>{tableName}</h2>
          <button className="close-button" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="loading-message">Loading {tableName} data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Description</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-data">No data found in {tableName}</td>
                  </tr>
                ) :
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td className="username-cell">
                        <span 
                          className="username-text"
                          onClick={() => copyToClipboard(row.username, 'username')}
                          title="Click to copy username"
                        >
                          {row.username}
                        </span>
                      </td>
                      {/* Password cell with toggle functionality and clickable text */}
                      <td className="password-cell">
                        {showPasswords[row.id] ? (
                          <span 
                            className="password-text"
                            onClick={() => copyToClipboard(decryptedPasswords[row.id], 'password')}
                            title="Click to copy password"
                          >
                            {decryptedPasswords[row.id] || 'Loading...'}
                          </span>
                        ) : (
                          <span className="password-text">••••••••</span>
                        )}
                        <button 
                          className="toggle-password"
                          onClick={() => handleTogglePassword(row.id)}
                          title={showPasswords[row.id] ? "Hide password" : "Show password"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d={showPasswords[row.id] 
                              ? "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                              : "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            } />
                          </svg>
                        </button>
                      </td>
                      <td>{row.description}</td>
                      <td>{formatDate(row.created_at)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
        
        {/* Toast notification */}
        {showToast && (
          <div className="toast-notification">
            <div className="toast-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="toast-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
              </svg>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableDetails;