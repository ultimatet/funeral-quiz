import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Auth0Provider
    domain={process.env.REACT_APP_AUTH0_DOMAIN}
    clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
    authorizationParams={{redirect_uri: window.location.origin, scope: "openid profile email"}}
    logoutParams={{returnTo: window.location.origin}}
    
> 
  <BrowserRouter>   
    <App />
  </BrowserRouter>
</Auth0Provider>
  </React.StrictMode>
);



