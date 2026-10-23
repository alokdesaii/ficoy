import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { syncTheme } from './theme';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ficoy';
  constructor() { syncTheme(); }
}
