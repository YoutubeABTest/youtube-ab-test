import React, { useState, useEffect } from 'react';

// Get API URL from environment variable or use fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod';

function App() {
  const [status, setStatus] = useState('Connecting...');
  const [apiResponse, setApiResponse] = useState(null);
  const [authStatus, setAuthStatus] = useState('Not authenticated');
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check URL parameters for OAuth response
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const token = urlParams.get('token');

    if (success === 'true' && token) {
      // Decode the access token
      try {
        const decodedToken = atob(token);
        setAccessToken(decodedToken);
        setAuthStatus('Successfully authenticated with YouTube!');
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Token decode error:', e);
        setAuthStatus('Authentication successful but token decode failed');
        setError('Failed to decode authentication token');
      }
    } else if (error) {
      setAuthStatus(`Authentication failed: ${error}`);
      setError(`Authentication error: ${error}`);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Test API connection with better error handling
    console.log('Attempting to connect to:', API_BASE_URL);
    
    fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        console.log('API Response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('API Response data:', data);
        setApiResponse(data);
        setStatus('Connected to API');
        setError(null);
      })
      .catch(error => {
        console.error('API Error:', error);
        setStatus('Failed to connect to API');
        setError(`API connection failed: ${error.message}`);
      });
  }, []);

  const handleLogin = () => {
    console.log('Redirecting to login:', `${API_BASE_URL}/login`);
    window.location.href = `${API_BASE_URL}/login`;
  };

  const handleLogout = () => {
    setAccessToken(null);
    setAuthStatus('Not authenticated');
    setError(null);
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#333', marginBottom: '30px' }}>YouTube A/B Testing Tool</h1>
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          background: '#ffe6e6', 
          padding: '15px', 
          borderRadius: '5px', 
          border: '1px solid #ffcccc',
          marginBottom: '20px',
          color: '#cc0000'
        }}>
          <h4>⚠️ Error:</h4>
          <p>{error}</p>
        </div>
      )}
      
      {/* Status Display */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '10px',
          marginBottom: '20px'
        }}>
          <div style={{ 
            background: status === 'Connected to API' ? '#e8f5e8' : '#fff3cd', 
            padding: '10px', 
            borderRadius: '5px',
            border: `1px solid ${status === 'Connected to API' ? '#c3e6cb' : '#ffeaa7'}`
          }}>
            <strong>API Status:</strong> {status}
          </div>
          <div style={{ 
            background: accessToken ? '#e8f5e8' : '#f8f9fa', 
            padding: '10px', 
            borderRadius: '5px',
            border: `1px solid ${accessToken ? '#c3e6cb' : '#dee2e6'}`
          }}>
            <strong>Auth Status:</strong> {authStatus}
          </div>
        </div>
        
        {apiResponse && (
          <details style={{ marginBottom: '20px' }}>
            <summary style={{ 
              cursor: 'pointer', 
              padding: '10px', 
              background: '#f8f9fa', 
              borderRadius: '5px',
              border: '1px solid #dee2e6'
            }}>
              View API Response Details
            </summary>
            <div style={{ 
              background: '#f0f0f0', 
              padding: '15px', 
              borderRadius: '0 0 5px 5px', 
              border: '1px solid #dee2e6',
              borderTop: 'none'
            }}>
              <pre style={{ 
                margin: 0, 
                fontSize: '12px', 
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          </details>
        )}

        {accessToken && (
          <div style={{ 
            background: '#e8f5e8', 
            padding: '15px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            border: '1px solid #c3e6cb'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>
              ✅ YouTube Access Token Received!
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
              Token: <code>{accessToken.substring(0, 20)}...</code>
            </p>
            <button 
              onClick={handleLogout}
              style={{
                padding: '8px 15px',
                fontSize: '14px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Main Action Area */}
      {!accessToken ? (
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={handleLogin}
            disabled={status !== 'Connected to API'}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: status === 'Connected to API' ? '#4285f4' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: status === 'Connected to API' ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Connect YouTube Account
          </button>
          {status !== 'Connected to API' && (
            <p style={{ color: '#6c757d', marginTop: '10px' }}>
              Please wait for API connection before logging in...
            </p>
          )}
        </div>
      ) : (
        <div style={{ 
          background: '#d4edda', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #c3e6cb',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#155724' }}>
            🎉 Successfully Connected to YouTube!
          </h3>
          <p style={{ margin: '0 0 10px 0', color: '#155724' }}>
            You can now use the A/B testing features.
          </p>
          <p style={{ margin: 0, fontStyle: 'italic', color: '#6c757d' }}>
            Next: We'll add functionality to fetch your videos and create A/B tests.
          </p>
        </div>
      )}

      {/* Debug Info */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px',
        fontSize: '12px', 
        color: '#6c757d',
        background: '#f8f9fa',
        borderRadius: '5px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Debug Information:</h4>
        <p><strong>API Endpoint:</strong> {API_BASE_URL}</p>
        <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
        <p><strong>Build Time:</strong> {new Date().toISOString()}</p>
      </div>
    </div>
  );
}

export default App;