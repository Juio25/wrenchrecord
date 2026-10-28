import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';

import { NuevoRegistroPageRoutingModule } from './nuevo-registro-routing.module';
import { NuevoRegistroPage } from './nuevo-registro.page';
import { OfflineBannerComponent } from '../shared/offline-banner/offline-banner.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    NuevoRegistroPageRoutingModule,
    OfflineBannerComponent
  ],
  declarations: [
    NuevoRegistroPage
  ]
})
export class NuevoRegistroPageModule {}
