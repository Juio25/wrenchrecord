import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule } from '@ionic/angular/lazy';

import { LoginPage } from './tab1.page';
import { Tab1PageRoutingModule } from './tab1-routing.module';

import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';


@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    ExploreContainerComponentModule,
    Tab1PageRoutingModule
  ],

  declarations: [
    LoginPage
  ]
})
export class Tab1PageModule {}
