import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { ConsultaPage } from './tab2.page';
import { Tab2PageRoutingModule } from './tab2-routing.module';
import { OfflineBannerComponent } from '../shared/offline-banner/offline-banner.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    Tab2PageRoutingModule,
    OfflineBannerComponent   // standalone component – imported directly
  ],

  declarations: [
    ConsultaPage
  ]
})
export class Tab2PageModule {}


