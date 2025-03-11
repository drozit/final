import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

interface AuthResponse {
  token: string;
  role_id: number;
  user: any;
  department_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private router: Router) {}

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  async login(username: string, password: string): Promise<AuthResponse | undefined> {
    try {
      console.log('Попытка авторизации с данными:', { username, password });
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { username, password })
      );

      console.log('Ответ от сервера:', response);

      if (response?.token && response.user) {
        console.log('Полученные данные для пользователя:', response.user);

        localStorage.setItem('token', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('role', JSON.stringify(response.role_id));
        localStorage.setItem('department', JSON.stringify(response.department_id));  // Сохраняем department_id
        localStorage.setItem('email', response.user.email);  // Сохраняем email пользователя

        this.redirectUser(response.role_id, response.department_id);  // Передаем и роль, и отдел
        return response;
      }
      console.error('Ответ от сервера не содержит токена или данных пользователя');
      return undefined;
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      return Promise.reject('Ошибка при авторизации');
    }
  }

  decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1]; // Получаем payload
      const decoded = JSON.parse(atob(payload)); // Раскодируем Base64
      return decoded;
    } catch (error) {
      console.error('Ошибка декодирования токена:', error);
      return null;
    }
  }

  getCurrentUser() {
    try {
      const currentUser = localStorage.getItem('currentUser');
      console.log('Полученные данные из localStorage:', currentUser);

      if (currentUser) {
        return JSON.parse(currentUser);
      } else {
        console.log('Данные отсутствуют в localStorage');
        return null;
      }
    } catch (error) {
      console.error('Ошибка при парсинге данных пользователя:', error);
      return null;
    }
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }
    const decodedToken = this.decodeToken(token);
    if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
      return true;
    }
    return false;
  }

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Токен не найден');
      return new HttpHeaders();
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
  

  getProtectedData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/protected`, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Ошибка при получении защищённых данных:', error);
        return throwError(() => new Error('Ошибка при получении защищённых данных'));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  getRole(): number | null {
    return Number(localStorage.getItem('role')) || null;
  }

  getDepartmentId(): number | null {
    const departmentId = localStorage.getItem('department');
    console.log('Полученное значение department_id из localStorage:', departmentId); // Логируем значение
    return departmentId ? Number(departmentId) : null;
  }

  private redirectUser(role: number | string, departmentId: number | string): void {
    console.log('Перенаправление пользователя с ролью:', role, 'и отделом:', departmentId);

    if (role === 1) {
      // Для администратора
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 2) {
      // Для сотрудника, перенаправление в зависимости от отдела
      if (departmentId === '1') {
        this.router.navigate(['/employee/department1']); // Перенаправление для первого отдела
      } else if (departmentId === '2') {
        this.router.navigate(['/employee/department2']); // Перенаправление для второго отдела
      } else {
        this.router.navigate(['/home']); // Если нет отдела, перенаправление на главную
      }
    } else {
      // Для других ролей, например, обычного пользователя
      this.router.navigate(['/home']);
    }
  }
}
