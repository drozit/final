// ticket-type.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TicketTypeService {
  private apiUrl = 'http://localhost:3000/api/ticket_types'; // Путь к API для получения типов заявок

  constructor(private http: HttpClient) {}

  getTicketTypes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getDepartmentsForTicketType(ticketTypeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${ticketTypeId}/department`);
  }
}
