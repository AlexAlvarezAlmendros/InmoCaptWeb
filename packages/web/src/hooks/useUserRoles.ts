import { useAuth0 } from "@auth0/auth0-react";
import { useMemo } from "react";

interface UserRoles {
  isAdmin: boolean;
  isAgent: boolean;
  roles: string[];
  isLoading: boolean;
}

// Auth0 namespace for custom claims
const AUTH0_NAMESPACE = "https://otp-records.com";

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

    // Get roles from Auth0 custom claims (normalize to lowercase)
    const rawRoles: string[] = user[`${AUTH0_NAMESPACE}/roles`] || [];
    const roles = rawRoles.map((r) => r.toLowerCase());

    // Debug: log user object to see what Auth0 is returning
    console.log("Auth0 user object:", user);
    console.log("Roles from token:", roles);

    return {
      isAdmin: roles.includes("admin"),
      isAgent: roles.includes("agent") || !roles.includes("admin"),
      roles,
      isLoading: false,
    };
  }, [user, isLoading]);
}
