#!/bin/bash

# YouTube A/B Testing Tool - Frontend Deployment Script
set -e

# Configuration
APP_NAME="youtube-ab-test-frontend"
BRANCH_NAME="main"
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Frontend Deployment${NC}"

# Check if API Gateway URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide API Gateway URL as argument${NC}"
    echo -e "${YELLOW}Usage: ./deploy-frontend.sh https://your-api-id.execute-api.us-east-1.amazonaws.com/prod${NC}"
    exit 1
fi

API_GATEWAY_URL=$1
echo -e "${GREEN}📋 Using API Gateway URL: $API_GATEWAY_URL${NC}"

# Check if frontend directory exists
if [ ! -d "yt-ab-test-frontend" ]; then
    echo -e "${YELLOW}📦 Creating frontend directory and files...${NC}"
    mkdir -p yt-ab-test-frontend/src
    
    # Create package.json
    cat > yt-ab-test-frontend/package.json << EOFPACKAGE
{
  "name": "youtube-ab-test-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
EOFPACKAGE

    # Create vite.config.js
    cat > yt-ab-test-frontend/vite.config.js << EOFVITE
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react( )],
  define: {
    'process.env.REACT_APP_API_BASE_URL': JSON.stringify('$API_GATEWAY_URL')
  }
})
EOFVITE

    # Create index.html
    cat > yt-ab-test-frontend/index.html << EOFHTML
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>YouTube A/B Testing Tool</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOFHTML

    # Create main.jsx
    cat > yt-ab-test-frontend/src/main.jsx << EOFMAIN
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOFMAIN

    # Create App.jsx
    cat > yt-ab-test-frontend/src/App.jsx << EOFAPP
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '$API_GATEWAY_URL';

function App() {
  const [status, setStatus] = useState('Connecting...');
  const [apiResponse, setApiResponse] = useState(null);

  useEffect(() => {
    // Test API connection
    fetch(\`\${API_BASE_URL}/\`)
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
    window.location.href = \`\${API_BASE_URL}/login\`;
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
EOFAPP

    echo -e "${GREEN}✅ Frontend files created${NC}"
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📋 Initializing Git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit for frontend deployment"
fi

echo -e "${GREEN}🎉 Frontend deployment preparation completed!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Make sure you've updated Google OAuth redirect URI"
echo -e "   2. Push this code to a GitHub repository"
echo -e "   3. Use AWS Amplify Console to deploy from GitHub"
echo -e "   4. Or continue with automated Amplify deployment (requires GitHub repo)"

