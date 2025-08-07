import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Angular4PaystackModule } from 'angular4-paystack';

@NgModule({
  declarations: [],
  imports: [
    Angular4PaystackModule.forRoot('pk_test_12'),HttpClientModule,BrowserModule, IonicModule.forRoot()],
  providers: [HttpClient,{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  bootstrap: [],
})
export class AppModule {}
