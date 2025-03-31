import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Account.css';
import { FiHome, FiUser, FiDatabase } from 'react-icons/fi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Function to generate a unique key
const generateUniqueKey = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Add type definition for Account
interface Account {
  id: number;
  username: string;
  password: string;
  description: string;
  created_at: string;
}

interface Notification {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

const Account: React.FC = () => {
  const navigate = useNavigate();
  const { platformName: urlPlatformName } = useParams<{ platformName?: string }>();
  const username = localStorage.getItem('username');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Data states
  const [tables, setTables] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedTable, setSelectedTable] = useState(urlPlatformName || '');
  const [platformName, setPlatformName] = useState('');
  const [accountDetails, setAccountDetails] = useState({
    username: '',
    password: '',
    description: ''
  });
  
  // UI states
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addType, setAddType] = useState<'platform' | 'account' | null>(null);
  const [deleteType, setDeleteType] = useState<'platform' | 'account' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState('');
  
  // Error states
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [accountError, setAccountError] = useState('');

  // Add notification state
  const [notification, setNotification] = useState<Notification>({
    show: false,
    message: '',
    type: 'success'
  });

  // Add new state for toggle mode
  const [isAddMode, setIsAddMode] = useState(false);

  // Add new states for account deletion
  const [selectedAccountForDeletion, setSelectedAccountForDeletion] = useState<any>(null);
  const [showAccountList, setShowAccountList] = useState(false);
  const [accountsInTable, setAccountsInTable] = useState<Account[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationType, setDeleteConfirmationType] = useState<'platform' | 'account' | null>(null);

  // Add new state for platform name confirmation
  const [confirmPlatformName, setConfirmPlatformName] = useState('');

  // Add new states for edit mode
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [platformToEdit, setPlatformToEdit] = useState('');
  const [newPlatformName, setNewPlatformName] = useState('');
  const [showEditAccountList, setShowEditAccountList] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);
  const [editAccountDetails, setEditAccountDetails] = useState<Account>({
    id: 0,
    username: '',
    password: '',
    description: '',
    created_at: new Date().toISOString()
  });

  // Add new state for edit form
  const [showEditForm, setShowEditForm] = useState(false);

  // Add new state for edit confirmation
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);

  // Add new state for edit platform
  const [showEditPlatform, setShowEditPlatform] = useState(false);
  const [confirmPlatformEdit, setConfirmPlatformEdit] = useState('');

  // Add new state for edited account
  const [editedAccount, setEditedAccount] = useState<Account | null>(null);

  // Add new state for edit account
  const [showEditAccount, setShowEditAccount] = useState(false);

  // Add notification timeout cleanup
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  useEffect(() => {
    fetchTables();
    
    // If we have a platform name from the URL, load its accounts
    if (urlPlatformName) {
      setSelectedTable(urlPlatformName);
      fetchTableAccounts(urlPlatformName);
    }
  }, [urlPlatformName]);

  const fetchTables = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/tables', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        const tableNames = data.map(item => item.table_name);
        setTables(tableNames);
      }
    } catch (error) {
      setError('Failed to load tables');
    }
  };

  const handleAddClick = () => {
    setIsAddModalOpen(true);
    setAddType('platform');
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleAddSubmit = () => {
    if (addType === 'platform') {
      handleAddPlatform();
    } else if (addType === 'account') {
      handleAddAccount();
    }
  };

  const handleDeleteSubmit = () => {
    if (deleteType === 'platform') {
      handleDeletePlatform();
    } else if (deleteType === 'account') {
      handleDeleteAccount();
    }
  };

  const handleAddPlatform = async () => {
    if (!platformName.trim()) {
      setError('Please enter a platform name');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3000/api/account/createTable', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ tableName: platformName })
      });

      if (response.ok) {
        await fetchTables();
        setNotification({
          show: true,
          message: 'Platform added successfully!',
          type: 'success'
        });
        setIsAddModalOpen(false);
        setIsAddMode(false);
        setPlatformName('');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create platform');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async () => {
    const missingFields = [];
    if (!accountDetails.username) missingFields.push('Username');
    if (!accountDetails.password) missingFields.push('Password');
    if (!accountDetails.description) missingFields.push('Description');
    if (!selectedTable) missingFields.push('Platform');

    if (missingFields.length > 0) {
      setAccountError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsLoading(true);
    setAccountError('');
    
    try {
      const requestBody = {
        username: accountDetails.username,
        password: accountDetails.password,
        description: accountDetails.description
      };

      const response = await fetch(`http://localhost:3000/api/account/table/${selectedTable}/add-account`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add account');
      }

      setAccountDetails({
        username: '',
        password: '',
        description: ''
      });
      setIsAddModalOpen(false);
      setIsAddMode(false);
      
      setNotification({
        show: true,
        message: 'Account added successfully!',
        type: 'success'
      });
      
      await fetchTables();
    } catch (error: any) {
      setAccountError(error.message || 'Failed to add account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlatform = async () => {
    if (!platformToDelete.trim()) {
      setDeleteError('Please enter a platform name');
      return;
    }

    if (!tables.includes(platformToDelete)) {
      setDeleteError('Platform not found');
      return;
    }

    if (confirmPlatformName !== platformToDelete) {
      setDeleteError('Platform name does not match');
      return;
    }

    setIsLoading(true);
    setDeleteError('');
    
    try {
      const response = await fetch(`http://localhost:3000/api/account/table/${platformToDelete}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        await fetchTables();
        setShowDeleteConfirmation(false);
        setIsDeleteModalOpen(false);
        setIsDeleteMode(false);
        setPlatformToDelete('');
        setConfirmPlatformName('');
        setNotification({
          show: true,
          message: 'Platform deleted successfully!',
          type: 'success'
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete platform');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete platform');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedTable || !selectedAccountForDeletion) {
      setDeleteError('No account selected for deletion');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/account/table/${selectedTable}/account/${selectedAccountForDeletion.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setShowDeleteConfirmation(false);
        setSelectedAccountForDeletion(null);
        setShowAccountList(false);
        setNotification({
          show: true,
          message: 'Account deleted successfully!',
          type: 'success'
        });
        await fetchTableAccounts(selectedTable);
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete account');
      }
    } catch (err) {
      setDeleteError('Failed to delete account');
    }
  };

  const handleEditClick = (account: Account) => {
    setSelectedAccountForEdit(account);
    setEditedAccount({
      id: account.id,
      username: account.username || '',
      password: account.password || '',
      description: account.description || '',
      created_at: account.created_at
    });
    setShowEditAccount(true);
  };

  const resetAllModals = () => {
    setIsAddModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedTable('');
    setPlatformName('');
    setAccountDetails({
      username: '',
      password: '',
      description: ''
    });
    setError('');
    setDeleteError('');
    setAccountError('');
    setAddType(null);
    setDeleteType(null);
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/${selectedTable}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data = await response.json();
      setAccounts(data);
    } catch (error: unknown) {
      setAccountError(error instanceof Error ? error.message : 'Failed to fetch accounts');
    }
  };

  const fetchTableAccounts = async (tableName: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/account/table/${tableName}/accounts`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data = await response.json();
      setAccountsInTable(data);
    } catch (error) {
      setError('Failed to fetch accounts');
    }
  };

  const handleEditPlatform = async () => {
    if (!platformToEdit || !newPlatformName.trim()) {
      setError('Platform name cannot be empty.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/account/table/${platformToEdit}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName: newPlatformName }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename platform');
      }

      setTables(prevTables => 
        prevTables.map(table => 
          table === platformToEdit ? newPlatformName : table
        )
      );
      setShowEditPlatform(false);
      setPlatformToEdit('');
      setNewPlatformName('');
      setNotification({
        show: true,
        message: `Platform "${platformToEdit}" renamed to "${newPlatformName}" successfully`,
        type: 'success'
      });
    } catch (err) {
      setError('Failed to rename platform. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAccount = async () => {
    if (!editedAccount || !selectedTable || !selectedAccountForEdit) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Missing required information for update'
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/account/table/${selectedTable}/account/${selectedAccountForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: editedAccount.username,
          password: editedAccount.password,
          description: editedAccount.description
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update account');
      }

      setAccountsInTable(accounts => 
        accounts.map(acc => acc.id === selectedAccountForEdit.id ? {
          ...acc,
          username: editedAccount.username,
          password: editedAccount.password,
          description: editedAccount.description
        } : acc)
      );

      setShowEditAccount(false);
      setSelectedAccountForEdit(null);
      setEditedAccount(null);
      setNotification({ 
        show: true, 
        type: 'success', 
        message: 'Account updated successfully' 
      });
    } catch (error) {
      setNotification({ 
        show: true, 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update account' 
      });
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
            className="nav-item active"
          >
            <FiUser className="icon" />
            Accounts
          </button>
          <button 
            className="nav-item"
            onClick={() => {
              sessionStorage.removeItem('userVerified');
              navigate('/user-verification', { state: { from: '/backup' } });
            }}
          >
            <FiDatabase className="icon" />
            Backup
          </button>
        </nav>
        <div className="sidebar-footer">
          <span className="welcome-text">Welcome, {username}!</span>
          <button className="logout-button" onClick={() => navigate('/')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V9" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="account-container">
          <div className="account-header">
            <h1>Account Management</h1>
          </div>
          <div className="search-section">
            <div className="action-buttons">
              <button 
                className={`action-button ${isAddMode ? 'active' : ''}`}
                onClick={() => {
                  setIsAddMode(!isAddMode);
                  if (isDeleteMode) setIsDeleteMode(false);
                  if (isEditMode) setIsEditMode(false);
                }}
              >
                {isAddMode ? (
                  <span onClick={(e) => {
                    e.stopPropagation();
                    setIsAddModalOpen(true);
                    setAddType('platform');
                  }}>Add Platform</span>
                ) : 'Add'}
              </button>
              <button 
                className={`action-button ${isEditMode ? 'active' : ''}`}
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isAddMode) setIsAddMode(false);
                  if (isDeleteMode) setIsDeleteMode(false);
                  if (isEditMode) {
                    setPlatformToEdit('');
                    setShowEditPlatform(true);
                  }
                }}
              >
                {isEditMode ? 'Edit Platform' : 'Edit'}
              </button>
              <button 
                className={`action-button delete-button ${isDeleteMode ? 'active' : ''}`} 
                onClick={() => {
                  setIsDeleteMode(!isDeleteMode);
                  if (isAddMode) setIsAddMode(false);
                  if (isEditMode) setIsEditMode(false);
                  if (isDeleteMode) {
                    setPlatformToDelete('');
                    setIsDeleteModalOpen(true);
                  }
                }}
              >
                {isDeleteMode ? 'Delete Platform' : 'Delete'}
              </button>
            </div>
          </div>

          {/* Add Platform Modal */}
          {isAddModalOpen && addType === 'platform' && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Add New Platform</h2>
                <div className="modal-input-group">
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="Enter platform name"
                  />
                </div>
                {error && <div className="error-message">{error}</div>}
                <div className="modal-buttons">
                  <button 
                    className="confirm-button"
                    onClick={handleAddPlatform}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      'Add Platform'
                    )}
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsAddMode(false);
                      setPlatformName('');
                      setError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Modal - Account Details */}
          {isAddModalOpen && addType === 'account' && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Add Account to {selectedTable}</h2>
                <div className="modal-input-group">
                  <input
                    type="text"
                    value={accountDetails.username}
                    onChange={(e) => setAccountDetails({...accountDetails, username: e.target.value})}
                    placeholder="Username"
                    required
                  />
                  <div className="password-input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={accountDetails.password}
                      onChange={(e) => setAccountDetails({...accountDetails, password: e.target.value})}
                      placeholder="Password"
                      required
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={accountDetails.description}
                    onChange={(e) => setAccountDetails({...accountDetails, description: e.target.value})}
                    placeholder="Description (required)"
                    required
                  />
                </div>
                {accountError && <div className="error-message">{accountError}</div>}
                <div className="modal-buttons">
                  <button 
                    onClick={handleAddAccount}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Adding Account...' : 'Add Account'}
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsAddMode(false);
                      setAccountDetails({
                        username: '',
                        password: '',
                        description: ''
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Platform Modal */}
          {isDeleteModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Delete Platform</h2>
                <div className="modal-input-group">
                  <input
                    type="text"
                    value={platformToDelete}
                    onChange={(e) => setPlatformToDelete(e.target.value)}
                    placeholder="Enter platform name to delete"
                  />
                </div>
                {deleteError && <div className="error-message">{deleteError}</div>}
                <div className="modal-buttons">
                  <button 
                    onClick={() => {
                      if (!platformToDelete.trim() || !tables.includes(platformToDelete)) {
                        setDeleteError('Please enter a valid platform name');
                        return;
                      }
                      setDeleteConfirmationType('platform');
                      setShowDeleteConfirmation(true);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      'Next'
                    )}
                  </button>
                  <button onClick={() => {
                    setIsDeleteModalOpen(false);
                    setIsDeleteMode(false);
                    setPlatformToDelete('');
                    setConfirmPlatformName('');
                    setDeleteError('');
                  }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Table List */}
          <div className="tables-list">
            {tables.map((table) => (
              <div key={table} className="table-item">
                <span className="table-name">{table}</span>
                <div className="table-actions">
                  {isAddMode && (
                    <button 
                      className="add-account-button"
                      onClick={() => {
                        setSelectedTable(table);
                        setAccountDetails({
                          username: '',
                          password: '',
                          description: ''
                        });
                        setAddType('account');
                        setIsAddModalOpen(true);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Add Account
                    </button>
                  )}
                  {isEditMode && (
                    <button 
                      className="edit-account-button"
                      onClick={async () => {
                        setSelectedTable(table);
                        await fetchTableAccounts(table);
                        setShowEditAccountList(true);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Edit Account
                    </button>
                  )}
                  {isDeleteMode && (
                    <button 
                      className="delete-account-button"
                      onClick={async () => {
                        setSelectedTable(table);
                        await fetchTableAccounts(table);
                        setShowAccountList(true);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete Account
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Notification Component */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="notification-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="notification-icon error">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            {notification.message}
          </div>
        </div>
      )}

      {/* Edit Account List Modal */}
      {showEditAccountList && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Account in {selectedTable}</h2>
            </div>
            <div className="accounts-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Password</th>
                    <th>Description</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accountsInTable.map((account) => (
                    <tr key={account.id}>
                      <td>{account.id}</td>
                      <td>{account.username}</td>
                      <td>••••••••</td>
                      <td>{account.description}</td>
                      <td>{new Date(account.created_at).toLocaleString()}</td>
                      <td>
                        <button
                          className="edit-button"
                          onClick={() => handleEditClick(account)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowEditAccountList(false);
                  setSelectedTable('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account List Modal */}
      {showAccountList && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete Account from {selectedTable}</h2>
            </div>
            <div className="accounts-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Password</th>
                    <th>Description</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accountsInTable.map((account) => (
                    <tr key={account.id}>
                      <td>{account.id}</td>
                      <td>{account.username}</td>
                      <td>••••••••</td>
                      <td>{account.description}</td>
                      <td>{new Date(account.created_at).toLocaleString()}</td>
                      <td>
                        <button
                          className="delete-button"
                          onClick={() => {
                            setSelectedAccountForDeletion(account);
                            setDeleteConfirmationType('account');
                            setShowDeleteConfirmation(true);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowAccountList(false);
                  setSelectedTable('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Deletion</h2>
            {deleteConfirmationType === 'platform' ? (
              <div>
                <p>Are you sure you want to delete the platform "{platformToDelete}"?</p>
                <p>This action cannot be undone and will delete all accounts associated with this platform.</p>
                <p className="delete-warning">Please type <strong>{platformToDelete}</strong> to confirm deletion:</p>
                <div className="modal-input-group">
                  <input
                    type="text"
                    value={confirmPlatformName}
                    onChange={(e) => setConfirmPlatformName(e.target.value)}
                    placeholder="Type platform name to confirm"
                    className={`delete-confirm-input ${confirmPlatformName === platformToDelete ? 'valid' : ''}`}
                  />
                </div>
              </div>
            ) : (
              <div>
                <p>Are you sure you want to delete this account?</p>
                <div className="account-details">
                  <p>Username: {selectedAccountForDeletion?.username}</p>
                  <p>Description: {selectedAccountForDeletion?.description}</p>
                </div>
              </div>
            )}
            <div className="modal-buttons">
              <button
                onClick={() => {
                  if (deleteConfirmationType === 'platform') {
                    handleDeletePlatform();
                  } else {
                    handleDeleteAccount();
                  }
                }}
                className="delete-button"
                disabled={deleteConfirmationType === 'platform' && confirmPlatformName !== platformToDelete}
              >
                Confirm Delete
              </button>
              <button onClick={() => {
                setShowDeleteConfirmation(false);
                setSelectedAccountForDeletion(null);
                setDeleteConfirmationType(null);
                setConfirmPlatformName('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Platform Modal */}
      {showEditPlatform && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Platform Name</h2>
            {!platformToEdit ? (
              <>
                <p>Select the platform you want to rename:</p>
                <div className="platform-selection-list">
                  {tables.map((table) => (
                    <button
                      key={table}
                      className="platform-selection-button"
                      onClick={() => setPlatformToEdit(table)}
                    >
                      {table}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p>Enter the new name for platform "{platformToEdit}":</p>
                <input
                  type="text"
                  className="edit-confirm-input"
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  placeholder="Enter new platform name"
                />
              </>
            )}
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowEditPlatform(false);
                  setPlatformToEdit('');
                  setNewPlatformName('');
                }}
              >
                Cancel
              </button>
              {platformToEdit && (
                <button
                  className="confirm-button"
                  disabled={!newPlatformName.trim()}
                  onClick={handleEditPlatform}
                >
                  Rename Platform
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Form Modal */}
      {showEditAccount && selectedAccountForEdit && editedAccount && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Account in {selectedTable}</h2>
            </div>
            <div className="edit-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={editedAccount.username}
                  onChange={(e) => setEditedAccount({
                    ...editedAccount,
                    username: e.target.value
                  })}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="text"
                  value={editedAccount.password}
                  onChange={(e) => setEditedAccount({
                    ...editedAccount,
                    password: e.target.value
                  })}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editedAccount.description}
                  onChange={(e) => setEditedAccount({
                    ...editedAccount,
                    description: e.target.value
                  })}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button className="cancel-button" onClick={() => {
                setShowEditAccount(false);
                setSelectedAccountForEdit(null);
                setEditedAccount(null);
              }}>
                Close
              </button>
              <button className="confirm-button" onClick={handleEditAccount}>
                Update Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Account; 