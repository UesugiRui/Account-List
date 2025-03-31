import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Edit.css';

interface EditProps {}

const Edit: React.FC<EditProps> = () => {
  const { tableName } = useParams<{ tableName: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableData, setTableData] = useState<any>(null);

  useEffect(() => {
    const fetchTableData = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/table/${tableName}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch table data');
        }

        const data = await response.json();
        setTableData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching table data:', err);
        setError('Failed to load table data');
        setLoading(false);
      }
    };

    if (tableName) {
      fetchTableData();
    }
  }, [tableName]);

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/table/${tableName}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(tableData)
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      // Navigate back to Account page after successful save
      navigate('/account');
    } catch (err) {
      console.error('Error saving changes:', err);
      setError('Failed to save changes');
    }
  };

  const handleCancel = () => {
    navigate('/account');
  };

  if (loading) {
    return (
      <div className="edit-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="edit-container">
        <div className="error">{error}</div>
        <button className="back-button" onClick={handleCancel}>
          Back to Accounts
        </button>
      </div>
    );
  }

  return (
    <div className="edit-container">
      <div className="edit-header">
        <h2>Editing {tableName}</h2>
      </div>

      <div className="edit-content">
        {/* Add your form fields here based on the table structure */}
        {/* This is a placeholder for the actual form fields */}
        <div className="form-group">
          <label>Platform Name:</label>
          <input
            type="text"
            value={tableData?.name || ''}
            onChange={(e) => setTableData({ ...tableData, name: e.target.value })}
            className="form-input"
          />
        </div>
        {/* Add more form fields as needed */}
      </div>

      <div className="edit-actions">
        <button className="cancel-button" onClick={handleCancel}>
          Cancel
        </button>
        <button className="save-button" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Edit; 