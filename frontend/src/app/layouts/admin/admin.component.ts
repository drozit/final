import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Убедись, что путь правильный

@Component({
  selector: 'app-admin',
  standalone: true,  // Standalone компонент
  imports: [RouterModule], // Импортируем RouterModule
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent {

  constructor(private authService: AuthService, private router: Router) {}

  logout() {
    this.authService.logout(); // Вызываем метод выхода из AuthService
    this.router.navigate(['/login']); // Перенаправляем на страницу логина
  }
}
