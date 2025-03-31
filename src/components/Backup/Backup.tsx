import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiDatabase, FiLogOut } from 'react-icons/fi';
import './Backup.css';
import { FaDatabase, FaUpload } from 'react-icons/fa';

const Backup: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState(0);
  const username = localStorage.getItem('username');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBackup = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      const response = await fetch('http://localhost:3000/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = `Failed to create backup: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          if (errorData.error) {
            errorMessage += `: ${errorData.error}`;
          }
        } catch (jsonError) {
        }
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const contentLength = +(response.headers.get('Content-Length') || 0);
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      if (!reader) {
        throw new Error('Failed to read response body');
      }

      while(true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength > 0) {
          setProgress(Math.round((receivedLength / contentLength) * 100));
        }
      }

      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="?([^"]*)"?/);
      const defaultFilename = `accmnglist_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      const filename = filenameMatch ? filenameMatch[1] : defaultFilename;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Backup created successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create backup');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    const formData = new FormData();
    formData.append('backupFile', file);

    try {
      const uploadResponse = await fetch('http://localhost:3000/api/backup/restore', {
        method: 'POST',
        body: formData
      });

      const contentType = uploadResponse.headers.get('Content-Type');
      
      if (contentType && contentType.includes('text/event-stream')) {
        const reader = uploadResponse.body?.getReader();
        
        if (!reader) {
          throw new Error('Failed to read response stream');
        }
        
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; 
          
          for (const message of messages) {
            if (message.startsWith('data: ')) {
              try {
                const data = JSON.parse(message.substring(6));
                
                if (data.error) {
                  throw new Error(data.error);
                }
                
                if (data.progress !== undefined) {
                  setProgress(data.progress);
                }
                
                if (data.message) {
                  setSuccess(data.message);
                }
                
                if (data.progress === 100) {
                  sessionStorage.removeItem('userVerified');
                  setTimeout(() => navigate('/'), 2000);
                }
              } catch (e) {
              }
            }
          }
        }
      } else {
        if (!uploadResponse.ok) {
          try {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.message || 'Failed to restore backup');
          } catch (jsonError) {
            throw new Error(`Failed to restore backup: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }
        }
        
        setSuccess('Database restored successfully!');
        sessionStorage.removeItem('userVerified');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to restore backup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>AccountList</h1>
        </div>
        <nav className="sidebar-nav">
          <button 
            className="nav-item"
            onClick={() => navigate('/dashboard')}
          >
            <FiHome className="icon" />
            Dashboard
          </button>
          <button 
            className="nav-item"
            onClick={() => {
              sessionStorage.removeItem('userVerified');
              navigate('/user-verification', { state: { from: '/account' } });
            }}
          >
            <FiUser className="icon" />
            Accounts
          </button>
          <button 
            className="nav-item active"
          >
            <FiDatabase className="icon" />
            Backup
          </button>
        </nav>
        <div className="sidebar-footer">
          <span className="welcome-text">Welcome, {username}!</span>
          <button className="logout-button" onClick={() => navigate('/')}>
            <FiLogOut className="icon" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="backup-content">
        <div className="backup-container">
          <h1>Database Backup & Restore</h1>
          <div className="backup-options">
            <div 
              className="backup-option" 
              onClick={!isLoading ? handleCreateBackup : undefined}
              style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              <FaDatabase className="icon" />
              <h3>{isLoading ? 'Processing...' : 'Back Up File'}</h3>
              {isLoading && progress > 0 && progress < 100 && (
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                  <span className="progress-text">{progress}%</span>
                </div>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreBackup}
              accept=".zip"
              className="file-input"
              id="restore-input"
              disabled={isLoading}
            />
            <label 
              className="backup-option" 
              htmlFor="restore-input"
              style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              <FaUpload className="icon" />
              <h3>{isLoading ? 'Processing...' : 'Restore Backup'}</h3>
              {isLoading && progress > 0 && progress < 100 && (
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                  <span className="progress-text">{progress}%</span>
                </div>
              )}
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </main>
    </div>
  );
};

export default Backup;