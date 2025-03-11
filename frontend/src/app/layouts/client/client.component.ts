import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-client',
  standalone: true,  // Standalone компонент
  imports: [RouterModule], // Импортируем RouterModule
  templateUrl: './client.component.html',
  styleUrl: './client.component.css'
})


export class ClientComponent {
  constructor(private authService: AuthService, private router: Router) {}


  logout() {
    this.authService.logout(); // Вызываем метод выхода из AuthService
    this.router.navigate(['/login']); // Перенаправляем на страницу логина
  }
}
