import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { RequestService } from '../../services/request.service';
import { DepartmentService } from '../../services/department.service';
import { TicketTypeService } from '../../services/ticket-type.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  requests: any[] = [];
  filteredRequests: any[] = [];
  departments: any[] = [];
  ticketTypes: any[] = [];
  statuses = ['открыта', 'в работе', 'завершена', 'отклонена'];
  userRole!: string; // Роль текущего пользователя, например, 'admin', 'user', etc.
  displayedRequests: any[] = [];  // Заявки, которые отображаются
  showAllRequests: boolean = false;


  newUser = { username: '', password: '', email: '', role_id: 3, department_id: undefined };
  newRequest = { title: '', description: '', ticket_type_id: null, department_id: null };

  searchUsername = ''; 
  selectedRole = ''; 
  selectedDepartment = ''; 
  selectedStatus = ''; 

  constructor(
    private userService: UserService,
    private requestService: RequestService,
    private departmentService: DepartmentService,
    private ticketTypeService: TicketTypeService,
    private authService : AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRequests();
    this.loadDepartments();
    this.loadTicketTypes();
    this.getRequests();
    this.userRole = 'admin';  
  }

  getRequests() {
    // Получаем заявки для отображения
    this.requestService.getRequestsForAdmin().subscribe((data: any[]) => {
      this.requests = data;
    });
  }

  loadRequests() {
    this.requestService.getAllRequests().subscribe(
      (data: any[]) => {
        this.requests = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Сортируем по дате создания
        this.filteredRequests = this.requests.slice(0, 5); // Показываем только 5 новых заявок
      },
      error => {
        console.error('Ошибка при загрузке заявок:', error);
      }
    );
  }
  
  
  toggleShowAll() {
    this.showAllRequests = !this.showAllRequests;
  
    if (this.showAllRequests) {
      // Показываем все заявки, отсортированные по убыванию даты создания
      this.filteredRequests = [...this.requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // Показываем только 5 самых новых заявок
      this.filteredRequests = [...this.requests]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    }
  }
  
  
  // Обновление списка заявок с фильтрами
  updateDisplayedRequests(): void {
    // Фильтруем заявки, если есть активные фильтры
    let requestsToDisplay = this.showAllRequests ? this.requests : this.requests.slice(0, 5);

    if (this.selectedStatus || this.selectedDepartment) {
      requestsToDisplay = requestsToDisplay.filter(request => {
        const matchesStatus = this.selectedStatus ? request.status === this.selectedStatus : true;
        const matchesDepartment = this.selectedDepartment ? request.department_id === this.selectedDepartment : true;

        return matchesStatus && matchesDepartment;
      });
    }

    this.displayedRequests = requestsToDisplay;
  }

  isAdmin(): boolean {
    return this.userRole === 'admin';
  }
  
  loadUsers() {
    this.userService.getUsers().subscribe(users => {
      console.log('Пользователи:', users); // Добавьте эту строку для проверки данных
      this.users = users;
      this.filteredUsers = users; // Изначально отображаем всех пользователей
    });
  }
  

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe(departments => {
      this.departments = departments;
    });
  }

  loadTicketTypes(): void {
    this.ticketTypeService.getTicketTypes().subscribe(types => {
      this.ticketTypes = types;
    });
  }

  addUser(): void {
    if (this.newUser.role_id === 2 && !this.newUser.department_id) {
      alert('Пожалуйста, выберите отдел');
      return;
    }
    this.userService.addUser(this.newUser).subscribe(() => {
      this.loadUsers();
      this.newUser = { username: '', password: '', email: '', role_id: 3, department_id: undefined };
      alert('Пользователь добавлен');
    });
  }

  addRequest(): void {
    this.requestService.addRequest(this.newRequest).subscribe(() => {
      this.loadRequests();
    });
  }

  deleteUser(userId: number): void {
    this.userService.deleteUser(userId).subscribe(() => {
      this.loadUsers();
    });
  }

  deleteRequest(requestId: number): void {
    this.requestService.deleteRequest(requestId).subscribe(() => {
      this.loadRequests();
    });
  }

  updateRequestStatus(requestId: number, status: string) {
    // Обновление статуса заявки через ваш сервис
    this.requestService.updateRequestStatus(requestId, status).subscribe(
      (updatedRequest) => {
        this.loadRequests();  // Перезагружаем заявки после обновления
        // Обновляем локальный список заявок
        const index = this.requests.findIndex(r => r.id === updatedRequest.id);
        if (index !== -1) {
          this.requests[index] = updatedRequest;
          this.filteredRequests = [...this.requests];  // Обновляем отфильтрованные заявки
        }
      },
      (error) => {
        console.error('Ошибка при обновлении статуса:', error);
      }
    );
  }

  // Фильтрация пользователей
  filterUsers() {
    this.filteredUsers = this.users.filter(user => {
      const matchesUsername = this.searchUsername ? user.username.includes(this.searchUsername) : true;
      const matchesRole = this.selectedRole ? user.role_id.toString() === this.selectedRole : true;

      const selectedDep = this.departments.find(dep => dep.id.toString() === this.selectedDepartment);
      const matchesDepartment = this.selectedDepartment ? user.department === selectedDep?.name : true;

      console.log('Фильтрация:', user.username, '| user.department:', user.department, '| selected:', selectedDep?.name);

      return matchesUsername && matchesRole && matchesDepartment;
    });
  }

  
  getDepartmentName(departmentId: number): string {
    const department = this.departments.find(d => d.id === departmentId);
    return department ? department.name : 'Не указан';
  }

  // Фильтрация заявок
  filterRequests(): void {
    // Логика фильтрации
    this.filteredRequests = this.requests.filter(request => {
      let matches = true;
      if (this.searchUsername) {
        matches = matches && request.username.toLowerCase().includes(this.searchUsername.toLowerCase());
      }
      if (this.selectedRole) {
        matches = matches && request.ticket_type === this.selectedRole; // Это пример фильтрации по роли
      }
      if (this.selectedDepartment) {
        matches = matches && request.department === this.selectedDepartment;
      }
      return matches;
    });

    // Если показываем все заявки
    if (this.showAllRequests) {
      this.filteredRequests = this.requests;
    } else {
      // Если показываем только первые 5 заявок
      this.filteredRequests = this.filteredRequests.slice(0, 5);
    }
  }
  
  
  

  // Обновление списка пользователей и заявок при изменении любого фильтра
  onFilterChange(): void {
    this.filterUsers(); 
    this.filterRequests(); 
  }
}
