const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem('lumen_access_token');
  }

  public static setToken(token: string) {
    localStorage.setItem('lumen_access_token', token);
  }

  public static removeToken() {
    localStorage.removeItem('lumen_access_token');
    localStorage.removeItem('lumen_active_workspace_id');
    localStorage.removeItem('lumen_active_project_id');
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Clear token and handle unauthorized redirect if not already on auth page
      const isAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
      if (!isAuthPage) {
        this.removeToken();
        const base = import.meta.env.BASE_URL || '/';
        const loginPath = base.endsWith('/') ? `${base}login` : `${base}/login`;
        window.location.href = loginPath;
      }
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((e: any) => `${e.loc?.slice(1)?.join('.') || 'field'}: ${e.msg}`).join(', ');
          }
        }
      } catch (e) {
        // Fallback to generic message
      }
      throw new Error(errorMessage);
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  public static get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public static post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
