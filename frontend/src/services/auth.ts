export type UserRole = 'admin' | 'employee' | 'student';

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string | null;
  is_active?: boolean;
}

const TOKEN_KEY = 'faceattend_token';
const USER_KEY = 'faceattend_user';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    const user = localStorage.getItem(USER_KEY);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  },

  setAuth(token: string, user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  isAdmin(): boolean {
    return this.getUser()?.role === 'admin';
  },

  isStudent(): boolean {
    return this.getUser()?.role === 'student';
  },

  isEmployee(): boolean {
    return this.getUser()?.role === 'employee';
  },

  hasRole(role: UserRole): boolean {
    return this.getUser()?.role === role;
  },

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.getUser()?.role;
    return !!userRole && roles.includes(userRole);
  },
};