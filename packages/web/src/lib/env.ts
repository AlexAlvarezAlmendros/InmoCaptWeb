// Environment variables
// These should be set in .env file

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  // Auth0
  AUTH0_DOMAIN: getEnvVar('VITE_AUTH0_DOMAIN', ''),
  AUTH0_CLIENT_ID: getEnvVar('VITE_AUTH0_CLIENT_ID', ''),
  AUTH0_AUDIENCE: getEnvVar('VITE_AUTH0_AUDIENCE', ''),

  // API
  API_URL: getEnvVar('VITE_API_URL', '/api'),

  // Stripe
  STRIPE_PUBLISHABLE_KEY: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', ''),

  // App
  APP_ENV: getEnvVar('VITE_APP_ENV', 'development'),
  IS_PRODUCTION: import.meta.env.PROD,
} as const;
