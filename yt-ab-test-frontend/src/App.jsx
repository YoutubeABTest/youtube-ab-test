import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod';

function App() {
  const [status, setStatus] = useState('Connecting...');
  const [authStatus, setAuthStatus] = useState('Not authenticated');
  const [accessToken, setAccessToken] = useState(null);
  const [videos, setVideos] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [testForm, setTestForm] = useState({
    variantA: '',
    variantB: ''
  });

  useEffect(() => {
    // Check URL parameters for OAuth response
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const token = urlParams.get('token');

    if (success === 'true' && token) {
      try {
        // Decode the base64 encoded token
        const decodedToken = atob(token);
        setAccessToken(decodedToken);
        setAuthStatus('Successfully authenticated with YouTube!');
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchVideos(decodedToken);
      } catch (e) {
        console.error('Token decode error:', e);
        setAuthStatus('Authentication successful but token decode failed');
      }
    } else if (error) {
      setAuthStatus(`Authentication failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Test API connection
    fetch(`${API_BASE_URL}/`)
      .then(response => response.json())
      .then(data => {
        setStatus('✅ Connected to API');
        console.log('API Response:', data);
      })
      .catch(error => {
        setStatus('❌ Failed to connect to API');
        console.error('API connection error:', error);
      });
  }, []);

  const fetchVideos = async (token = accessToken) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      } else {
        console.error('Failed to fetch videos:', response.statusText);
        setAuthStatus('Failed to fetch videos - token may be invalid');
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tests`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTests(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTest = async () => {
    if (!testForm.variantA.trim() || !testForm.variantB.trim()) {
      alert('Please fill in both thumbnail variants');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          videoId: selectedVideo.id,
          videoTitle: selectedVideo.title,
          originalThumbnail: selectedVideo.thumbnail,
          variantA: testForm.variantA,
          variantB: testForm.variantB
        })
      });
      
      if (response.ok) {
        setShowCreateTest(false);
        setTestForm({ variantA: '', variantB: '' });
        setSelectedVideo(null);
        setActiveTab('tests');
        fetchTests();
      } else {
        const errorData = await response.json();
        alert(`Failed to create test: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create test:', error);
      alert('Failed to create test: Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  const handleLogout = () => {
    setAccessToken(null);
    setAuthStatus('Not authenticated');
    setVideos([]);
    setTests([]);
    setActiveTab('videos');
  };

  useEffect(() => {
    if (accessToken) {
      if (activeTab === 'videos' && videos.length === 0) {
        fetchVideos();
      } else if (activeTab === 'tests') {
        fetchTests();
      }
    }
  }, [activeTab, accessToken]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎥 YouTube A/B Testing Tool</h1>
        
        <div className="status-section">
          <div className="status-item">
            <strong>API Status:</strong> {status}
          </div>
          <div className="status-item">
            <strong>Auth Status:</strong> {authStatus}
          </div>
          {accessToken && (
            <div className="status-item">
              <strong>Videos Loaded:</strong> {videos.length}
            </div>
          )}
        </div>

        {!accessToken ? (
          <div>
            <p style={{ fontSize: '18px', marginBottom: '30px', color: '#b3d9ff' }}>
              Connect your YouTube account to start creating thumbnail A/B tests
            </p>
            <button onClick={handleLogin} className="auth-button">
              🔗 Connect YouTube Account
            </button>
          </div>
        ) : (
          <div>
            <button onClick={handleLogout} className="auth-button logout">
              🚪 Logout
            </button>
            
            <div className="tabs">
              <button 
                className={activeTab === 'videos' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('videos')}
              >
                📹 My Videos
              </button>
              <button 
                className={activeTab === 'tests' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('tests')}
              >
                🧪 A/B Tests
              </button>
            </div>

            {activeTab === 'videos' && (
              <div className="videos-section">
                <h2>Your Recent Videos</h2>
                {loading ? (
                  <p>Loading videos...</p>
                ) : videos.length === 0 ? (
                  <div style={{ padding: '40px', color: '#b3d9ff' }}>
                    <p>No videos found. Make sure you have videos on your YouTube channel.</p>
                  </div>
                ) : (
                  <div className="videos-grid">
                    {videos.map(video => (
                      <div key={video.id} className="video-card">
                        <img src={video.thumbnail} alt={video.title} />
                        <h3>{video.title}</h3>
                        <p style={{ color: '#b3d9ff', fontSize: '14px', marginBottom: '15px' }}>
                          Published: {new Date(video.publishedAt).toLocaleDateString()}
                        </p>
                        <button 
                          onClick={() => {
                            setSelectedVideo(video);
                            setShowCreateTest(true);
                          }}
                          className="create-test-btn"
                        >
                          🧪 Create A/B Test
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="tests-section">
                <h2>Your A/B Tests</h2>
                {loading ? (
                  <p>Loading tests...</p>
                ) : tests.length === 0 ? (
                  <div style={{ padding: '40px', color: '#b3d9ff' }}>
                    <p>No tests created yet. Go to "My Videos" to create your first test!</p>
                  </div>
                ) : (
                  <div className="tests-list">
                    {tests.map(test => (
                      <div key={test.testId} className="test-card">
                        <h3>📹 {test.videoTitle}</h3>
                        <p><strong>Video ID:</strong> {test.videoId}</p>
                        <p><strong>Variant A:</strong> {test.variantA}</p>
                        <p><strong>Variant B:</strong> {test.variantB}</p>
                        <p><strong>Status:</strong> <span style={{color: test.status === 'active' ? '#4caf50' : '#ff9800'}}>{test.status}</span></p>
                        <p><strong>Created:</strong> {new Date(test.createdAt).toLocaleDateString()}</p>
                        
                        {test.metrics && (
                          <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(79, 195, 247, 0.1)', borderRadius: '8px' }}>
                            <h4 style={{ color: '#4fc3f7', margin: '0 0 10px 0' }}>📊 Test Results</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <div>
                                <strong>Variant A:</strong> {test.metrics.variantA?.views || 0} views, {test.metrics.variantA?.clicks || 0} clicks
                              </div>
                              <div>
                                <strong>Variant B:</strong> {test.metrics.variantB?.views || 0} views, {test.metrics.variantB?.clicks || 0} clicks
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showCreateTest && selectedVideo && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>🧪 Create A/B Test</h2>
              <p style={{ color: '#b3d9ff', marginBottom: '25px' }}>
                <strong>Video:</strong> {selectedVideo.title}
              </p>
              
              <div className="form-group">
                <label>🖼️ Thumbnail Variant A URL:</label>
                <input
                  type="text"
                  value={testForm.variantA}
                  onChange={(e) => setTestForm({...testForm, variantA: e.target.value})}
                  placeholder="Enter URL for first thumbnail variant..."
                />
              </div>
              
              <div className="form-group">
                <label>🖼️ Thumbnail Variant B URL:</label>
                <input
                  type="text"
                  value={testForm.variantB}
                  onChange={(e) => setTestForm({...testForm, variantB: e.target.value})}
                  placeholder="Enter URL for second thumbnail variant..."
                />
              </div>
              
              <div className="modal-buttons">
                <button onClick={() => {
                  setShowCreateTest(false);
                  setTestForm({ variantA: '', variantB: '' });
                  setSelectedVideo(null);
                }}>
                  Cancel
                </button>
                <button 
                  onClick={createTest} 
                  disabled={!testForm.variantA.trim() || !testForm.variantB.trim() || loading}
                >
                  {loading ? 'Creating...' : 'Create Test'}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
