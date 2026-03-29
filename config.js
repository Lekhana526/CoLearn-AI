// Determine the API base URL based on the current environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://PLACEHOLDER_RENDER_URL.onrender.com'; // TODO: Update this to your deployed Render URL once created
