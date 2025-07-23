import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod';

function App( ) {
  const [status, setStatus] = useState('Connecting...');
  const [apiResponse, setApiResponse] = useState(null);

  useEffect(() => {
    // Test API connection
    fetch(`${API_BASE_URL}/`)
      .then(response => response.json())
      .then(data => {
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>YouTube A/B Testing Tool</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Status: {status}</h3>
        {apiResponse && (
          <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
            <h4>API Response:</h4>
            <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}
      </div>

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

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>API Endpoint: {API_BASE_URL}</p>
      </div>
    </div>
  );
}

export default App;
