import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  getRequests(filters: any): Observable<any[]> {
    let params = new HttpParams();
  
    if (filters.department_id) {
      params = params.set('department_id', filters.department_id);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
  
    return this.http.get<any[]>(this.apiUrl + '/requests', { 
      params: filters, 
      headers: this.getHeaders() // Передаем токен через заголовки
      });
    }
  
    getAllRequests(): Observable<any[]> {
      return this.http.get<any[]>(this.apiUrl+ '/requests');
    }
    

  getRequestsByRole(roleId: number, userId: number, departmentId: number | null): Observable<any[]> {
    let params = new HttpParams().set('role', roleId.toString());

    if (roleId === 3 && userId) {
      params = params.set('user_id', userId.toString());
    } 

    if (roleId === 2 && departmentId !== null) {
      params = params.set('department_id', departmentId.toString());
    }

    return this.http.get<any[]>(`${this.apiUrl}/requests/all`, { params, headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Ошибка при загрузке заявок по роли:', error);
          return throwError(() => new Error('Ошибка загрузки заявок по роли'));
        })
      );
  }

  getDepartmentRequests(departmentId: number): Observable<any[]> {
    let params = new HttpParams().set('department_id', departmentId.toString());
  
    return this.http.get<any[]>(`${this.apiUrl}/requests/department`, { params, headers: this.getHeaders() });
  }
  
  getUserRequests(userId: number): Observable<any[]> {
    let params = new HttpParams().set('user_id', userId.toString());
  
    return this.http.get<any[]>(`${this.apiUrl}/requests`, { params, headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Ошибка при загрузке заявок пользователя:', error);
          return throwError(() => new Error('Ошибка загрузки заявок пользователя'));
        })
      );
  }
  

  addRequest(request: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/requests`, request, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Ошибка при добавлении заявки:', error);
          return throwError(() => new Error('Ошибка добавления заявки'));
        })
      );
  }

  deleteRequest(requestId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/requests/${requestId}`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Ошибка при удалении заявки:', error);
          return throwError(() => new Error('Ошибка удаления заявки'));
        })
      );
  }

  updateRequestStatus(requestId: number, newStatus: string): Observable<any> {
    // Отправляем запрос на сервер для обновления статуса заявки
    return this.http.post(`${this.apiUrl}/requests/update-status`, { requestId, newStatus }, { headers: this.getHeaders() })
      .pipe(
        catchError((error) => {
          console.error('Ошибка при обновлении статуса заявки:', error);
          return throwError(() => new Error('Ошибка обновления статуса заявки'));
        })
      );
  }
  
  getFilteredRequests(departmentId: string): Observable<any[]> {
    let params = new HttpParams();
  
    if (departmentId) {
      params = params.set('department_id', departmentId);
    }
  
    return this.http.get<any[]>(`${this.apiUrl}/requests`, { params })
      .pipe(
        catchError(error => {
          console.error('Ошибка при фильтрации заявок:', error);
          return throwError(() => new Error('Ошибка фильтрации заявок'));
        })
      );
  }

  getRequestsForAdmin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin`);  // API для получения заявок
  }


  sendRequest(data: any): Observable<any> {
    // Получаем токен с помощью AuthService
    const headers = this.authService.getAuthHeaders();
    
    if (!headers.has('Authorization')) {
      console.error('Токен не найден перед отправкой заявки');
      return throwError(() => new Error('Токен не найден'));
    }

    // Отправляем запрос с токеном
    return this.http.post(`${this.apiUrl}/request`, data, { headers }).pipe(
      catchError((error) => {
        console.error('Ошибка при отправке заявки:', error);
        return throwError(() => new Error('Ошибка при отправке заявки'));
      })
    );
  }
}
