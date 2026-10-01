import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { LoginPage } from './login.page';
import { LoginPageRoutingModule } from './login-routing.module';
import { OfflineBannerComponent } from '../shared/offline-banner/offline-banner.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    LoginPageRoutingModule,
    OfflineBannerComponent   // standalone component – imported directly
  ],

  declarations: [
    LoginPage
  ]
})
export class LoginPageModule {}


