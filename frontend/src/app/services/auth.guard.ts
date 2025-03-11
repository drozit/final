import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Путь к сервису может отличаться

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot, 
    state: RouterStateSnapshot
  ): boolean {
    const token = localStorage.getItem('token');
    const userRole = Number(localStorage.getItem('role'));

    if (!token) {
      console.warn('Пользователь не авторизован. Перенаправляем на страницу логина.');
      this.router.navigate(['/login']);
      return false;
    }

    // Проверяем, если маршрут относится к админке
    if (state.url.startsWith('/admin') && userRole !== 1) {
      console.warn(' Нет прав администратора. Перенаправляем на главную.');
      this.router.navigate(['/home']);
      return false;
    }

    return true; // Доступ разрешён
  }
}
