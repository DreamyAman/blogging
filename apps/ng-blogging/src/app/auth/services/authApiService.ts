import { inject, Injectable } from "@angular/core";
import { ICreateUserRequest } from "../types/register.type";
import { HttpClient } from "@angular/common/http";
import { ILoginRequest, ILoginResponse } from "../types/login.types";
import { catchError, Observable } from "rxjs";
import { IRefreshTokenResponse } from "../types/refresh-token.types";
import { environment } from "../../../enviroments/environment";
import { handleApiError } from "../../common/http/utils/api-error.utils";

Injectable();
export class AuthApiService {
    private readonly authApiUrl = `${environment.apiBaseUrl}/auth`;

  private readonly http = inject(HttpClient);

  public register(
    createUserRequest: ICreateUserRequest,
  ): Observable<ILoginResponse> {
    return this.http
      .post<ILoginResponse>(`${this.authApiUrl}/register`, createUserRequest, {
        withCredentials: true,
      })
      .pipe(catchError(handleApiError));
  }

  public login(loginCreds: ILoginRequest) {
    return this.http
      .post<ILoginResponse>(`${this.authApiUrl}/login`, loginCreds, {
        withCredentials: true,
      })
      .pipe(catchError(handleApiError));
  }

  public refreshToken() {
    return this.http.post<IRefreshTokenResponse>(
      `${this.authApiUrl}/refresh-token`,
      {},
      {
        withCredentials: true,
      },
    );
  }

  public logout() {
    return this.http.post<IRefreshTokenResponse>(
      `${this.authApiUrl}/logout`,
      {},
      {
        withCredentials: true,
      },
    );
  }
}