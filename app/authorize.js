const fs = require('fs');
const {google} = require('googleapis');
const ego = require('./authorize_backend');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

const TOKEN_PATH = 'creds/token.json';
const CREDS_PATH = 'creds/credentials.json';
var CLIENT_ID;
var CLIENT_SECRET;
var REDIRECT_URI;

function operate(callback) {
  // Load client secrets from a local file.
  fs.readFile(CREDS_PATH, (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Docs API.
    authorize(JSON.parse(content), callback);
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  CLIENT_ID = client_id;
  CLIENT_SECRET = client_secret;
  REDIRECT_URI = redirect_uris[0];
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getNewToken(oAuth2Client, callback) {
  const browserWindowParams = {
    'use-content-size': true,
    center: true,
    show: true,
    resizable: false,
    'always-on-top': true,
    'standard-window': true,
    'auto-hide-menu-bar': true,
    'node-integration': false
  };
  const googleOauth = ego.ego(browserWindowParams);
  const token = await googleOauth.getAccessToken(
    SCOPES,
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
  oAuth2Client.setCredentials(token);
  
  // Store the token to disk for later program executions
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) console.error(err);
    console.log('Token stored to', TOKEN_PATH);
  });
  callback(oAuth2Client);
}

module.exports = { operate }