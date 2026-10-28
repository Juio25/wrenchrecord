import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NuevoRegistroPage } from './nuevo-registro.page';

const routes: Routes = [
  {
    path: '',
    component: NuevoRegistroPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NuevoRegistroPageRoutingModule {}
