import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';

interface UserRoles {
  isAdmin: boolean;
  isAgent: boolean;
  roles: string[];
  isLoading: boolean;
}

// Auth0 namespace for custom claims
const AUTH0_NAMESPACE = 'https://inmocapt.com';

export function useUserRoles(): UserRoles {
  const { user, isLoading } = useAuth0();

  return useMemo(() => {
    if (isLoading || !user) {
      return {
        isAdmin: false,
        isAgent: false,
        roles: [],
        isLoading,
      };
    }

    // Get roles from Auth0 custom claims
    const roles: string[] = user[`${AUTH0_NAMESPACE}/roles`] || [];

    return {
      isAdmin: roles.includes('admin'),
      isAgent: roles.includes('agent') || !roles.includes('admin'),
      roles,
      isLoading: false,
    };
  }, [user, isLoading]);
}
