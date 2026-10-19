import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraficaGastosComponent } from '../shared/grafica-gastos/grafica-gastos.component';
import { IonicModule } from '@ionic/angular/lazy';

import { DashboardPage } from './tab3.page';
import { Tab3PageRoutingModule } from './tab3-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    Tab3PageRoutingModule,
    GraficaGastosComponent
  ],

  declarations: [
    DashboardPage
  ]
})
export class Tab3PageModule {}
