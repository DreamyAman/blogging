import { computed, effect, inject, Injectable, signal } from "@angular/core";
import { AuthApiService } from "./authApiService";
import { ILoginRequest, ILoginResponse } from "../types/login.types";
import { ICreateUserRequest } from "../types/register.type";
import { catchError, finalize, map, Observable, shareReplay, Subscription, switchMap, tap, throwError, timer } from "rxjs";

Injectable();
export class AuthService {
    
    private readonly authApi = inject(AuthApiService);
    private readonly authToken = signal<string | null>(
    (() => {
      const accessToken = window.localStorage.getItem('acessToken');

      try {
        return accessToken;
      } catch {
        return null;
      }
    })(),
  );

  //WHY IFEE has been chosen if the normal function would eveventually work fine;

  private readonly userData = signal(
    (() => {
      const user = window.localStorage.getItem('userKey');

      try {
        return JSON.parse(user as string);
      } catch {
        return null;
      }
    })(),
  );
  
    public readonly user = computed(() => {
    if (!this.isAuthenticated()) {
      return null;
    }

    return this.userData();
  });

  public readonly isAuthenticated = computed(() => !!this.authToken());
  constructor (){
    effect(() => {
      const accessToken = this.authToken();
      const user = this.user();

      if (accessToken) {
        window.localStorage.setItem('acessToken', accessToken);
      }

      if (user) {
        window.localStorage.setItem("userKey", JSON.stringify(user));
      }
    });
  }

  public register(
    createUserRequest: ICreateUserRequest,
  ): Observable<ILoginResponse> {
    return this.authApi
      .register(createUserRequest)
      .pipe(tap((resp) => this.setSession(resp)));
  }

  public login(loginCreds: ILoginRequest) {
    return this.authApi
      .login(loginCreds)
      .pipe(tap((resp) => this.setSession(resp)));
  }

  private setSession(resp: ILoginResponse) {
    const { data } = resp;

    this.authToken.set(data.accessToken);
    this.userData.set(data.user);

    this.scheduleBackgroundRefresh();
  }

  private backgrounRefreshTimeSubscription: Subscription | null = null;
  private refreshTokenObservable$: Observable<string> | null = null;



    public isTokenNearExpiry() {
    try {
      const iat = Date.now();
      const exp = iat + 15 * 60 * 1000;

      const totalLifetime = exp - iat;
      const refreshDelay = totalLifetime * 0.8;
      const refreshTime = iat + refreshDelay;
      const timeUntilRefresh = refreshTime - Date.now();

      return {
        needRefresh: Date.now() >= refreshTime,
        timeUntilRefresh,
        refreshDelay,
      };
    } catch {
      return {
        needRefresh: true,
        timeUntilRefresh: 0,
        refreshDelay: 0,
      };
    }
  }

  private updateToken(accessToken: string) {
    this.authToken.set(accessToken);

    this.scheduleBackgroundRefresh();
  }

  private scheduleBackgroundRefresh() {
    this.clearBackgroundRefreshTimer();

    const { timeUntilRefresh, refreshDelay } = this.isTokenNearExpiry();

    if (timeUntilRefresh > 0) {
      this.backgrounRefreshTimeSubscription = timer(refreshDelay)
        .pipe(switchMap(() => this.refreshToken()))
        .subscribe({
          error: (err) => console.error("Background refresh failed", err),
        });
    } else {
      this.refreshToken().subscribe({
        error: (err) =>
          console.error("Immediate background refresh failed", err),
      });
    }
  }

    public refreshToken() {
    if (this.refreshTokenObservable$) {
      return this.refreshTokenObservable$;
    }

    this.refreshTokenObservable$ = this.authApi.refreshToken().pipe(
      map((resp) => resp.data.accessToken),
      tap((accessToken) => this.updateToken(accessToken)),
      shareReplay(1),
      finalize(() => {
        this.refreshTokenObservable$ = null;
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      }),
    );

    return this.refreshTokenObservable$;
  }

  private clearBackgroundRefreshTimer() {
    if (this.backgrounRefreshTimeSubscription) {
      this.backgrounRefreshTimeSubscription.unsubscribe();
    }
  }

    public logout() {
    this.authApi
      .logout()
      .pipe(
        finalize(() => {
          this.clearBackgroundRefreshTimer();
          this.authToken.set(null);
          this.userData.set(null);
          window.localStorage.clear();
        }),
      )
      .subscribe({
        error: console.warn,
      });
  }
}