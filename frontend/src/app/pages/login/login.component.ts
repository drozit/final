import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  passwordVisible: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.loginUser().then();
  }

  async loginUser(): Promise<void> {
    try {
      const response = await this.authService.login(this.username, this.password);
      console.log('Ответ от сервера:', response);

      if (response?.token && response?.role_id !== undefined && response?.department_id !== undefined) {
        console.log('Логин успешен! Сохранение токена, роли и отдела.');
        
       
        localStorage.setItem('token', response.token);
        localStorage.setItem('role', response.role_id.toString());
        localStorage.setItem('department', response.department_id.toString());

        console.log('Отдел, полученный от сервера:', response.department_id);

        // Перенаправляем пользователя
        this.redirectUser(response.role_id, response.department_id);
      } else {
        this.errorMessage = 'Неверный логин или пароль';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Ошибка при авторизации';
    }
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  private redirectUser(role: number | string, departmentId: number | string): void {
    console.log('Перенаправление пользователя с ролью:', role, 'и отделом:', departmentId); // Логируем роль и отдел перед редиректом

    if (role === 1) {
      
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 2) {
      
      if (departmentId === '1') {
        this.router.navigate(['/employee/department1']); 
      } else if (departmentId === '2') {
        this.router.navigate(['/employee/department2']); 
      } else {
        this.router.navigate(['/home']); 
      }
    } else {
      this.router.navigate(['/home']);
    }
  }
}
