// Forcing a new build with this comment
import React, { useState, useEffect } from 'react';

// Use the working API URL directly
const API_BASE_URL = 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod';

function App( ) {
  const [status, setStatus] = useState('Connecting...');
  const [apiResponse, setApiResponse] = useState(null);
  const [authStatus, setAuthStatus] = useState('Not authenticated');
  const [accessToken, setAccessToken] = useState(null);

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
        setAuthStatus('Authentication successful but token decode failed');
      }
    } else if (error) {
      setAuthStatus(`Authentication failed: ${error}`);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Test API connection
    console.log('Attempting to connect to:', API_BASE_URL);
    
    fetch(`${API_BASE_URL}/`)
      .then(response => {
        console.log('API Response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('API Response data:', data);
        setApiResponse(data);
        setStatus('Connected to API');
      })
      .catch(error => {
        console.error('API Error:', error);
        setStatus('Failed to connect to API');
      });
  }, []);

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  const handleLogout = () => {
    setAccessToken(null);
    setAuthStatus('Not authenticated');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>YouTube A/B Testing Tool</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>API Status: {status}</h3>
        <h3>Auth Status: {authStatus}</h3>
        
        {apiResponse && (
          <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
            <h4>API Response:</h4>
            <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}

        {accessToken && (
          <div style={{ background: '#e8f5e8', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
            <h4>✅ YouTube Access Token Received!</h4>
            <p>Token: {accessToken.substring(0, 20)}...</p>
            <button 
              onClick={handleLogout}
              style={{
                padding: '5px 10px',
                fontSize: '14px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {!accessToken ? (
        <button 
          onClick={handleLogin}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Connect YouTube Account
        </button>
      ) : (
        <div style={{ background: '#d4edda', padding: '15px', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
          <h3>🎉 Successfully Connected to YouTube!</h3>
          <p>You can now use the A/B testing features.</p>
          <p><em>Next: We'll add functionality to fetch your videos and create A/B tests.</em></p>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>API Endpoint: {API_BASE_URL}</p>
      </div>
    </div>
  );
}

export default App;
// Deploying from the correct directory
// Final fresh deployment from clone
