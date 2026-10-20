import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraficaGastosComponent } from '../shared/grafica-gastos/grafica-gastos.component';
import { IonicModule } from '@ionic/angular/lazy';
import { OfflineBannerComponent } from '../shared/offline-banner/offline-banner.component';
import { DashboardPage } from './tab3.page';
import { Tab3PageRoutingModule } from './tab3-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    Tab3PageRoutingModule,
    GraficaGastosComponent,
    OfflineBannerComponent
  ],

  declarations: [
    DashboardPage
  ]
})
export class Tab3PageModule {}
