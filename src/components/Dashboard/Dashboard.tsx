import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiUser, FiDatabase, FiLogOut, FiSearch, FiFolder } from 'react-icons/fi';
import TableDetails from './TableDetails';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Add this line to import location
  const [username, setUsername] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'backup'>('dashboard');
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlatforms, setFilteredPlatforms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Add the new useEffect for handling verification return
  useEffect(() => {
    // Check if we're returning from verification with state
    if (location.state) {
      const state = location.state as any;
      
      if (state.showTable) {
        setSelectedTable(state.showTable);
      }
    }
    
    // Clear location state if possible
    if (window.history && window.history.replaceState) {
      window.history.replaceState(
        {...(window.history.state || {}), state: undefined},
        document.title,
        location.pathname
      );
    }
  }, [location]);

  useEffect(() => {
    // Check if we should show a password after verification
    const shouldShowPassword = sessionStorage.getItem('shouldShowPassword');
    const tableName = sessionStorage.getItem('tableName');
    const rowId = sessionStorage.getItem('showPasswordForRow');
    const userVerified = sessionStorage.getItem('userVerified');
    
    if (shouldShowPassword === 'true' && tableName && rowId && userVerified === 'true') {
      // Open the table details for this table
      setSelectedTable(tableName);
      
      // Clear the session storage
      sessionStorage.removeItem('shouldShowPassword');
      sessionStorage.removeItem('tableName');
      sessionStorage.removeItem('showPasswordForRow');
      // Don't remove userVerified yet - TableDetails will need it
    }
  }, []);

  // Fetch tables when dashboard view is active
  useEffect(() => {
    const fetchTables = async () => {
      if (currentView === 'dashboard') {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch('http://localhost:3000/api/tables', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch tables');
          }

          const data = await response.json();

          if (Array.isArray(data)) {
            const tableNames = data.map(item => typeof item === 'string' ? item : item.table_name);
            setTables(tableNames);
            setFilteredPlatforms(tableNames.map(name => ({ id: name, name })));
          } else {
            throw new Error('Invalid data format received');
          }
        } catch (err) {
          setError('Failed to load platforms');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTables();
  }, [currentView]);

  // Add effect to filter platforms based on search term
  useEffect(() => {
    const filtered = tables.filter(table =>
      table.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPlatforms(filtered.map(name => ({ id: name, name })));
  }, [searchTerm, tables]);

  const openLogoutModal = () => {
    setShowLogoutModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    sessionStorage.removeItem('userVerified');
    navigate('/');
  };

  const handleNavigation = (destination: string) => {
    if (destination === '/account' || destination === '/backup') {
      sessionStorage.removeItem('userVerified');
      navigate('/user-verification', { state: { from: destination } });
    } else {
      setCurrentView(destination as 'dashboard' | 'backup');
    }
  };

  const handleTableDoubleClick = (tableName: string) => {
    setSelectedTable(tableName);
  };

  const handleCloseTableDetails = () => {
    setSelectedTable(null);
  };

  const handleViewAccounts = (platform: { id: string; name: string }) => {
    // Instead of navigating, set the selectedTable to display the table details
    setSelectedTable(platform.name);
  };

  const renderPlatformItem = (platform: { id: string; name: string }) => {
    return (
      <div 
        key={platform.id}
        className="platform-item"
        onDoubleClick={() => handleTableDoubleClick(platform.name)}
      >
        <FiFolder className="platform-icon" size={24} color="#00c3ff" />
        <span className="platform-name">{platform.name}</span>
        <div className="platform-actions">
          <button className="action-button" onClick={(e) => {
            e.stopPropagation();
            handleViewAccounts(platform);
          }}>
            View Accounts
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="dashboard-container">
            <h1 className="platform-header">Your Platforms</h1>
            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder="Search platforms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FiSearch className="search-icon" />
            </div>
            
            <div className="platform-list">
              {loading ? (
                <div className="empty-state">
                  <svg className="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="empty-state-text">Loading platforms...</p>
                </div>
              ) : error ? (
                <div className="empty-state">
                  <svg className="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="empty-state-text">{error}</p>
                </div>
              ) : filteredPlatforms.length === 0 ? (
                <div className="empty-state">
                  <svg className="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="empty-state-text">No platforms found</p>
                </div>
              ) : (
                filteredPlatforms.map((platform) => renderPlatformItem(platform))
              )}
            </div>
            {selectedTable && (
              <TableDetails
                tableName={selectedTable}
                onClose={handleCloseTableDetails}
              />
            )}
          </div>
        );
      case 'backup':
        return (
          <div className="backup-view">
            <h2>Backup</h2>
            <p>Backup functionality coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Account List</h1>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigation('dashboard')}
          >
            <FiHome className="icon" />
            Dashboard
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavigation('/account')}
          >
            <FiUser className="icon" />
            Accounts
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavigation('/backup')}
          >
            <FiDatabase className="icon" />
            Backup
          </button>
        </nav>
        <div className="sidebar-footer">
          <span className="welcome-text">Welcome, {username}!</span>
          <button className="logout-button" onClick={openLogoutModal}>
            <FiLogOut className="icon" />
            Logout
          </button>
        </div>
      </aside>
      {/* Main Content */}
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to logout?</p>
            <div className="modal-buttons">
              <button className="cancel-button" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="confirm-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
