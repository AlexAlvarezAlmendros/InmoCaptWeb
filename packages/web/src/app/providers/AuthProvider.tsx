import { Auth0Provider } from '@auth0/auth0-react';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { env } from '@/lib/env';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: { returnTo?: string }) => {
    navigate(appState?.returnTo || '/app/dashboard');
  };

  return (
    <Auth0Provider
      domain={env.AUTH0_DOMAIN}
      clientId={env.AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: env.AUTH0_AUDIENCE,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="memory"
    >
      {children}
    </Auth0Provider>
  );
}
