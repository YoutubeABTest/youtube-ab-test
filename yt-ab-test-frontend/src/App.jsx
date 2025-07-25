import React, { useState, useEffect } from 'react';

// Get API URL from environment variable or use fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://xa0etg74tg.execute-api.us-east-1.amazonaws.com/prod';

function App( ) {
  const [accessToken, setAccessToken] = useState(null);
  const [authStatus, setAuthStatus] = useState('Checking authentication...');
  const [videos, setVideos] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('videos');
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Handle authentication on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      try {
        const decodedToken = atob(token);
        setAccessToken(decodedToken);
        setAuthStatus('Successfully authenticated!');
        window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
      } catch (e) {
        setError('Authentication failed: Invalid token.');
      }
    } else {
      setAuthStatus('Not authenticated.');
    }
  }, []);

  // Fetch data when access token or active tab changes
  useEffect(() => {
    if (accessToken) {
      if (activeTab === 'videos') fetchVideos();
      if (activeTab === 'tests') fetchTests();
    }
  }, [accessToken, activeTab]);

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  const handleLogout = () => {
    setAccessToken(null);
    setAuthStatus('Logged out.');
    setVideos([]);
    setTests([]);
  };

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/videos`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        setVideos(data.videos || []);
      } else {
        throw new Error(data.error || 'Failed to fetch videos');
      }
    } catch (error) {
      setError(`Error fetching videos: ${error.message}`);
    }
    setLoading(false);
  };

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/tests`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        setTests(data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch tests');
      }
    } catch (error) {
      setError(`Error fetching tests: ${error.message}`);
    }
    setLoading(false);
  };

  const createTest = async (testData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      const data = await response.json();
      if (response.ok) {
        alert('A/B Test created successfully!');
        setShowCreateTest(false);
        setSelectedVideo(null);
        setActiveTab('tests'); // Switch to tests tab to see the new test
      } else {
        throw new Error(data.error || 'Failed to create test');
      }
    } catch (error) {
      alert(`Error creating test: ${error.message}`);
    }
    setLoading(false);
  };

  const handleCreateTestClick = (video) => {
    setSelectedVideo(video);
    setShowCreateTest(true);
  };

  // --- RENDER LOGIC ---

  if (!accessToken) {
    return (
      <div style={styles.container}>
        <h1>YouTube A/B Testing Tool</h1>
        <p>{authStatus}</p>
        <button onClick={handleLogin} style={styles.loginButton}>Connect YouTube Account</button>
        {error && <p style={styles.errorText}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>YouTube A/B Testing Tool</h1>
        <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
      </div>
      
      {error && <p style={styles.errorText}>{error}</p>}

      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('videos')} style={activeTab === 'videos' ? styles.activeTab : styles.tab}>My Videos</button>
        <button onClick={() => setActiveTab('tests')} style={activeTab === 'tests' ? styles.activeTab : styles.tab}>A/B Tests</button>
      </div>

      {loading && <p>Loading...</p>}

      {activeTab === 'videos' && !loading && (
        <div style={styles.grid}>
          {videos.map(video => (
            <div key={video.id} style={styles.card}>
              <img src={video.thumbnail} alt={video.title} style={styles.thumbnail} />
              <h3 style={styles.cardTitle}>{video.title}</h3>
              <p style={styles.cardDate}>Published: {new Date(video.publishedAt).toLocaleDateString()}</p>
              <button onClick={() => handleCreateTestClick(video)} style={styles.createButton}>Create A/B Test</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tests' && !loading && (
        <div style={styles.grid}>
          {tests.length > 0 ? tests.map(test => (
            <div key={test.testId} style={styles.card}>
              <h3 style={styles.cardTitle}>{test.videoTitle}</h3>
              <div style={styles.variants}>
                <div><strong>A (Original):</strong> {test.variantA.title}</div>
                <div><strong>B (Test):</strong> {test.variantB.title}</div>
              </div>
              <p style={styles.cardDate}>Status: <span style={{color: 'green', textTransform: 'capitalize'}}>{test.status}</span></p>
              <p style={styles.cardDate}>Created: {new Date(test.createdAt).toLocaleString()}</p>
            </div>
          )) : <p>No A/B tests found. Create one from the "My Videos" tab!</p>}
        </div>
      )}

      {showCreateTest && selectedVideo && (
        <CreateTestModal video={selectedVideo} onClose={() => setShowCreateTest(false)} onSubmit={createTest} loading={loading} />
      )}
    </div>
  );
}

function CreateTestModal({ video, onClose, onSubmit, loading }) {
  const [variantA, setVariantA] = useState({ title: video.title, thumbnail: video.thumbnail });
  const [variantB, setVariantB] = useState({ title: '', thumbnail: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!variantB.title.trim()) {
      alert('Please enter a title for Variant B.');
      return;
    }
    onSubmit({ videoId: video.id, videoTitle: video.title, originalThumbnail: video.thumbnail, variantA, variantB });
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2>Create Test for: {video.title}</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>Variant A (Original Title)</label>
            <input type="text" value={variantA.title} onChange={(e) => setVariantA({ ...variantA, title: e.target.value })} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label>Variant B (New Title)</label>
            <input type="text" value={variantB.title} onChange={(e) => setVariantB({ ...variantB, title: e.target.value })} style={styles.input} placeholder="Enter new title for testing" required />
          </div>
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelButton} disabled={loading}>Cancel</button>
            <button type="submit" style={styles.submitButton} disabled={loading}>{loading ? 'Creating...' : 'Start A/B Test'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Basic styling
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  loginButton: { padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '5px' },
  logoutButton: { padding: '8px 12px', cursor: 'pointer', backgroundColor: '#db4437', color: 'white', border: 'none', borderRadius: '5px' },
  tabs: { margin: '20px 0', borderBottom: '1px solid #ccc' },
  tab: { padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' },
  activeTab: { padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: '16px', borderBottom: '3px solid #4285F4', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  thumbnail: { width: '100%', borderRadius: '4px', aspectRatio: '16 / 9', objectFit: 'cover' },
  cardTitle: { fontSize: '16px', margin: '10px 0', flexGrow: 1 },
  cardDate: { fontSize: '12px', color: '#666' },
  createButton: { width: '100%', padding: '10px', border: 'none', borderRadius: '4px', backgroundColor: '#34A853', color: 'white', cursor: 'pointer', fontSize: '14px', marginTop: '10px' },
  variants: { fontSize: '14px', background: '#f8f9fa', padding: '10px', borderRadius: '4px', margin: '10px 0' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '500px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' },
  formGroup: { marginBottom: '15px' },
  input: { width: 'calc(100% - 22px)', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  cancelButton: { padding: '10px 20px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' },
  submitButton: { padding: '10px 20px', border: 'none', borderRadius: '4px', background: '#4285F4', color: 'white', cursor: 'pointer' },
  errorText: { color: 'red', background: '#ffe6e6', padding: '10px', borderRadius: '5px', border: '1px solid red' }
};

export default App;
