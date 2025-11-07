// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const {google} = require('googleapis');

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  credentials: true
}));
app.use(bodyParser.json());

// session cookie to store tokens (for demo; for production use a DB)
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_KEY || 'change-this-secret'],
  maxAge: 24 * 60 * 60 * 1000
}));

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly', // Search Console read-only
  'https://www.googleapis.com/auth/userinfo.email'
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  (process.env.OAUTH_REDIRECT || 'http://localhost:3000/oauth2callback')
);

// helper to set credentials from session
function setCredsFromSession(req) {
  const tokens = req.session.tokens;
  if (!tokens) return false;
  oauth2Client.setCredentials(tokens);
  return true;
}

// Start OAuth flow
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: OAUTH_SCOPES
  });
  res.redirect(url);
});

// OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code found');
  try {
    const {tokens} = await oauth2Client.getToken(code);
    req.session.tokens = tokens;          // store tokens in session cookie (or DB)
    oauth2Client.setCredentials(tokens);

    // redirect to a frontend page that calls /api/properties or /api/data
    const redirectTo = process.env.FRONTEND_ORIGIN || 'http://localhost:5500';
    res.redirect(redirectTo + '/?authed=1');
  } catch (err) {
    console.error(err);
    res.status(500).send('Auth error');
  }
});

// Get list of verified properties for user (sites)
app.get('/api/properties', async (req, res) => {
  if (!setCredsFromSession(req)) return res.status(401).json({error: 'not authenticated'});
  try {
    const webmasters = google.webmasters({version: 'v3', auth: oauth2Client});
    const resp = await webmasters.sites.list();
    // filter sites which are "site" type; resp.data.siteEntry is array
    const sites = (resp.data.siteEntry || []).map(s => ({siteUrl: s.siteUrl, permissionLevel: s.permissionLevel}));
    res.json({sites});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
});

// Query Search Analytics (performance) for a site
app.post('/api/performance', async (req, res) => {
  if (!setCredsFromSession(req)) return res.status(401).json({error: 'not authenticated'});
  const {siteUrl, startDate, endDate, dimension, rowLimit} = req.body;
  if (!siteUrl) return res.status(400).json({error: 'siteUrl required'});
  try {
    const webmasters = google.webmasters({version: 'v3', auth: oauth2Client});
    const requestBody = {
      startDate: startDate,
      endDate: endDate,
      dimensions: dimension ? [dimension] : ['query'],
      rowLimit: rowLimit || 25
    };
    const resp = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody
    });
    // resp.data.rows is array of {keys:[...], clicks, impressions, ctr, position}
    res.json({rows: resp.data.rows || []});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
});

// Simple route to check auth
app.get('/api/whoami', async (req, res) => {
  if (!setCredsFromSession(req)) return res.json({authed:false});
  // get userinfo
  try{
    const oauth2 = google.oauth2({version:'v2', auth: oauth2Client});
    const u = await oauth2.userinfo.get();
    res.json({authed:true, user:u.data});
  } catch(err){
    console.error(err);
    res.json({authed:false});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
