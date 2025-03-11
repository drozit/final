import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api'; // Маршрут для работы с пользователями

  constructor(private http: HttpClient, private authService: AuthService  ) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }


  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Ошибка при загрузке пользователей:', error);
          return throwError(() => new Error('Ошибка загрузки пользователей'));
        })
      );
  }

  // Фильтрация пользователей по роли и департаменту
  getFilteredUsers(roleId: number | null, departmentId: number | null): Observable<any[]> {
    let params = new HttpParams();

    if (roleId !== null) {
      params = params.set('role_id', roleId.toString());
    }

    if (departmentId !== null) {
      params = params.set('department_id', departmentId.toString());
    }

    return this.http.get<any[]>(`${this.apiUrl}/users`, { params, headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Ошибка при фильтрации пользователей:', error);
          return throwError(() => new Error('Ошибка фильтрации пользователей'));
        })
      );
  }

  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/api/departments');
  }

  addUser(user: { username: string, password: string, email: string, role_id: number }): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${userId}`);
  }
}
