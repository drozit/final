import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RequestService } from '../../services/request.service';
import { TicketTypeService } from '../../services/ticket-type.service';
import { DepartmentService } from '../../services/department.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  public requestData = {
    title: '',
    description: '',
  };
  user: any;
  ticketTypes: any[] = [];
  departments: any[] = [];
  requests: any[] = [];
  departmentRequests: any[] = []; // 🔹 Добавлено для заявок отдела
  newRequest = {
    title: '',
    description: '',
    ticket_type_id: null as number | null,
    department_id: null as number | null,
    user_id: null,
    username: '',
    email: '',
  };
  userRole: number | null = null;

  constructor(
    private authService: AuthService,
    private requestService: RequestService,
    private ticketTypeService: TicketTypeService,
    private departmentService: DepartmentService,
    private http: HttpClient // Для отправки запросов

  ) {}

  async ngOnInit(): Promise<void> {
    // Проверяем наличие токена перед загрузкой данных
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Токен не найден');
      this.authService.redirectToLogin();  // Перенаправление на страницу входа, если токен не найден
      return;  // Прерываем выполнение метода, если нет токена
    }
  
    // Если токен есть, продолжаем загрузку данных
    await this.loadUser();
    await this.loadTicketTypes();
    await this.loadDepartments();
    await this.loadUserRequests();
    await this.loadDepartmentRequests();  // 🔹 Загружаем заявки отдела
  }
  

  async loadUser(): Promise<void> {
    this.user = this.authService.getCurrentUser();
    console.log('Пользователь:', this.user); // Проверяем, что возвращает getCurrentUser()
    console.log('Email пользователя:', this.user?.email);

    if (this.user) {
      this.newRequest.user_id = this.user.id;
      this.newRequest.username = this.user.username;
      this.newRequest.email = this.user.email;
      this.userRole = this.user.role_id || Number(localStorage.getItem('role'));
      console.log('Заполняем newRequest:', this.newRequest); // Проверяем, что в newRequest есть email

      const departmentFromStorage = localStorage.getItem('department');
      this.newRequest.department_id = departmentFromStorage
        ? JSON.parse(departmentFromStorage)
        : this.user.department_id;
    } else {
      alert('Вы не авторизованы! Пожалуйста, войдите в систему.');
      this.authService.redirectToLogin();
    }
  }

  async loadTicketTypes(): Promise<void> {
    try {
      this.ticketTypes = await firstValueFrom(this.ticketTypeService.getTicketTypes());
    } catch (error) {
      console.error('Ошибка загрузки типов заявок:', error);
    }
  }

  async loadDepartments(): Promise<void> {
    try {
      this.departments = await firstValueFrom(this.departmentService.getDepartments());
    } catch (error) {
      console.error('Ошибка загрузки отделов:', error);
    }
  }

  async loadUserRequests(): Promise<void> {
    if (!this.user || !this.userRole) {
      console.error('Пользователь или роль не определены');
      return;
    }

    try {
      this.requests = await firstValueFrom(
        this.requestService.getUserRequests(this.user.id)
      );
    } catch (error) {
      console.error('Ошибка загрузки личных заявок:', error);
    }
  }

  async loadDepartmentRequests(): Promise<void> {
    if (!this.user || !this.userRole || !this.newRequest.department_id) {
      return;
    }

    // Только сотрудники отдела (роль 2) могут видеть заявки своего отдела
    if (this.userRole === 2) {
      try {
        this.departmentRequests = await firstValueFrom(
          this.requestService.getDepartmentRequests(this.newRequest.department_id)
        );
      } catch (error) {
        console.error('Ошибка загрузки заявок отдела:', error);
      }
    }
  }

  updateRequestStatus(requestId: number, status: string): void {
    this.requestService.updateRequestStatus(requestId, status).subscribe(
      () => {
        console.log(`Заявка ${requestId} обновлена до: ${status}`);
        this.loadUserRequests();
        this.loadDepartmentRequests(); 
      },
      (error) => console.error('Ошибка обновления заявки:', error)
    );
  }

  async submitRequest(): Promise<void> {
    const { title, description, ticket_type_id, department_id, user_id, username, email } =
      this.newRequest;
    let missingFields = [];

    if (!title) missingFields.push('Заголовок');
    if (!description) missingFields.push('Описание');
    if (!ticket_type_id) missingFields.push('Тип заявки');
    if (!department_id) missingFields.push('Отдел');
    if (!user_id) missingFields.push('ID пользователя');
    if (!username) missingFields.push('Имя пользователя');
    if (!email) missingFields.push('Email');

    if (missingFields.length > 0) {
      alert(`Пожалуйста, заполните: ${missingFields.join(', ')}`);
      return;
    }

    try {
      const response = await firstValueFrom(this.requestService.addRequest(this.newRequest));
      alert('Заявка успешно отправлена!');

      await this.loadUserRequests();
      await this.loadDepartmentRequests();

      // После успешного добавления заявки — генерация файла и отправка
      this.generateWordDocumentAndSendEmail();
    } catch (error) {
      console.error('Ошибка при добавлении заявки:', error);
      alert('Ошибка при добавлении заявки.');
    }
  }

  async generateWordDocumentAndSendEmail() {
    if (!this.newRequest.title || !this.newRequest.description || !this.newRequest.ticket_type_id) {
      alert('Пожалуйста, заполните все поля перед генерацией документа.');
      return;
    }
  
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Заявка на поддержку',
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph(' '),
            new Paragraph(`🔹 Заголовок: ${this.newRequest.title}`),
            new Paragraph(
              `🔹 Тип заявки: ${
                this.ticketTypes.find((t) => t.id === this.newRequest.ticket_type_id)?.name
              }`
            ),
            new Paragraph(
              `🔹 Отдел: ${
                this.departments.find((d) => d.id === this.newRequest.department_id)?.name
              }`
            ),
            new Paragraph(`🔹 Описание: ${this.newRequest.description}`),
            new Paragraph(`🔹 Пользователь: ${this.newRequest.username}`),
          ],
        },
      ],
    });
  
    const blob = await Packer.toBlob(doc);
    const fileName = `Заявка_${this.newRequest.title}.docx`;
    saveAs(blob, fileName);
  
    // Получаем токен из localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Токен не найден');
      return;
    }
  
    // Отправляем документ на сервер для отправки email
    const formData = new FormData();
    console.log(this.newRequest); // Печатает данные newRequest
    console.log(this.newRequest.department_id); // Проверяешь, что department_id не пустое
    formData.append('file', blob, fileName);
    formData.append('department', this.newRequest.department_id!.toString());
    formData.append('username', this.newRequest.username);
    formData.append('email', this.newRequest.email);
  
    fetch('http://localhost:3000/send-document', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,  // Отправка токена в заголовке
      },
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        console.log('Документ отправлен:', data);
      })
      .catch(error => {
        console.error('Ошибка при отправке документа:', error);
      });
  }

  onSubmitRequest(): void {
    // Перед отправкой проверим, что пользователь авторизован
    if (!this.authService.isLoggedIn()) {
      console.error('Пользователь не авторизован');
      return;
    }

    // Вызываем метод sendRequest из RequestsService для отправки данных
    this.requestService.sendRequest(this.requestData).subscribe({
      next: (response) => {
        console.log('Заявка отправлена успешно:', response);
        // Обработка успешного ответа от сервера
      },
      error: (err) => {
        console.error('Ошибка при отправке заявки:', err);
        // Обработка ошибки
      }
    });
  }
  
  updateStatus(requestId: number, status: string): void {
    this.requestService.updateRequestStatus(requestId, status).subscribe(
      (response) => {
        alert(`Заявка обновлена до статуса: ${status}`);
        this.loadUserRequests(); // Обновляем список заявок пользователя после изменения статуса
        this.loadDepartmentRequests(); // Если это нужно для сотрудников отдела
      },
      (error) => {
        console.error('Ошибка при обновлении статуса заявки:', error);
        alert('Произошла ошибка при обновлении статуса заявки. Попробуйте еще раз позже.');
      }
    );
  }
  

  onTicketTypeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const ticketTypeId = +selectElement.value;
    const ticketType = this.ticketTypes.find((type) => type.id === ticketTypeId);

    if (ticketType) {
      this.newRequest.department_id = ticketType.department_id;
    } else {
      this.newRequest.department_id = null;
    }

    this.newRequest.ticket_type_id = ticketTypeId;
  }
}
