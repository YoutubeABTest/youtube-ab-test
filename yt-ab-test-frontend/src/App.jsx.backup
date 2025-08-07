import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod';

function App( ) {
  const [status, setStatus] = useState('Connecting...');
  const [authStatus, setAuthStatus] = useState('Not authenticated');
  const [accessToken, setAccessToken] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [showChannelSelector, setShowChannelSelector] = useState(false);

  useEffect(() => {
    // Check URL parameters for OAuth response
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const token = urlParams.get('token');

    if (success === 'true' && token) {
      try {
        const decodedToken = atob(token);
        setAccessToken(decodedToken);
        setAuthStatus('Successfully authenticated with YouTube!');
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchChannels(decodedToken);
      } catch (e) {
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
        if (data.needsChannel && accessToken) {
          setActiveTab('channels');
        }
      })
      .catch(error => {
        setStatus('❌ Failed to connect to API');
        console.error('API connection error:', error);
      });
  }, [accessToken]);

  const fetchChannels = async (token) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/channels`, {
        headers: {
          'Authorization': `Bearer ${token || accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels);
        if (data.selectedChannelId) {
          const selected = data.channels.find(c => c.id === data.selectedChannelId);
          if (selected) {
            setSelectedChannel(selected);
            setActiveTab('videos');
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectChannel = async (channel) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/channels/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ channelId: channel.id })
      });
      
      if (response.ok) {
        setSelectedChannel(channel);
        setShowChannelSelector(false);
        setActiveTab('videos');
        fetchVideos(channel.id);
      }
    } catch (error) {
      console.error('Failed to select channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async (channelId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/videos`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-YouTube-Channel-Id': channelId || selectedChannel?.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    if (!selectedChannel) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tests`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-YouTube-Channel-Id': selectedChannel.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-YouTube-Channel-Id': selectedChannel.id
        },
        body: JSON.stringify({
          videoId: selectedVideo.id,
          originalTitle: selectedVideo.title,
          newTitle: newTitle
        })
      });
      
      if (response.ok) {
        setShowCreateTest(false);
        setNewTitle('');
        setSelectedVideo(null);
        setActiveTab('tests');
        fetchTests();
      }
    } catch (error) {
      console.error('Failed to create test:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth`;
  };

  const handleLogout = () => {
    setAccessToken(null);
    setAuthStatus('Not authenticated');
    setChannels([]);
    setSelectedChannel(null);
    setVideos([]);
    setTests([]);
    setActiveTab('channels');
  };

  useEffect(() => {
    if (activeTab === 'videos' && selectedChannel && videos.length === 0) {
      fetchVideos();
    } else if (activeTab === 'tests' && selectedChannel) {
      fetchTests();
    }
  }, [activeTab, selectedChannel]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>YouTube A/B Testing Tool</h1>
        
        {selectedChannel && (
          <div className="channel-header">
            <img src={selectedChannel.thumbnail} alt={selectedChannel.title} className="channel-thumbnail" />
            <span>{selectedChannel.title}</span>
            <button onClick={() => setShowChannelSelector(true)} className="change-channel-btn">
              Change Channel
            </button>
          </div>
        )}
        
        <div className="status-section">
          <div className="status-item">
            <strong>API Status:</strong> {status}
          </div>
          <div className="status-item">
            <strong>Auth Status:</strong> {authStatus}
          </div>
        </div>

        {!accessToken ? (
          <button onClick={handleLogin} className="auth-button">
            Connect YouTube Account
          </button>
        ) : (
          <div>
            <button onClick={handleLogout} className="auth-button logout">
              Logout
            </button>
            
            {!selectedChannel || showChannelSelector ? (
              <div className="channel-selection">
                <h2>Select a YouTube Channel</h2>
                {loading ? (
                  <p>Loading channels...</p>
                ) : (
                  <div className="channels-grid">
                    {channels.map(channel => (
                      <div key={channel.id} className="channel-card" onClick={() => selectChannel(channel)}>
                        <img src={channel.thumbnail} alt={channel.title} />
                        <h3>{channel.title}</h3>
                        <p>{parseInt(channel.subscriberCount).toLocaleString()} subscribers</p>
                        <p>{channel.videoCount} videos</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="tabs">
                  <button 
                    className={activeTab === 'videos' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('videos')}
                  >
                    My Videos
                  </button>
                  <button 
                    className={activeTab === 'tests' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('tests')}
                  >
                    A/B Tests
                  </button>
                </div>

                {activeTab === 'videos' && (
                  <div className="videos-section">
                    <h2>Your Recent Videos</h2>
                    {loading ? (
                      <p>Loading videos...</p>
                    ) : (
                      <div className="videos-grid">
                        {videos.map(video => (
                          <div key={video.id} className="video-card">
                            <img src={video.thumbnail} alt={video.title} />
                            <h3>{video.title}</h3>
                            <button 
                              onClick={() => {
                                setSelectedVideo(video);
                                setShowCreateTest(true);
                              }}
                              className="create-test-btn"
                            >
                              Create A/B Test
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
                      <p>No tests created yet. Go to "My Videos" to create your first test!</p>
                    ) : (
                      <div className="tests-list">
                        {tests.map(test => (
                          <div key={test.testId} className="test-card">
                            <h3>Video: {test.originalTitle}</h3>
                            <p><strong>Original:</strong> {test.originalTitle}</p>
                            <p><strong>New Title:</strong> {test.newTitle}</p>
                            <p><strong>Status:</strong> {test.status}</p>
                            <p><strong>Created:</strong> {new Date(test.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showCreateTest && selectedVideo && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Create A/B Test</h2>
              <p><strong>Video:</strong> {selectedVideo.title}</p>
              <div className="form-group">
                <label>New Title to Test:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter alternative title..."
                />
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowCreateTest(false)}>Cancel</button>
                <button onClick={createTest} disabled={!newTitle.trim()}>
                  Create Test
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
