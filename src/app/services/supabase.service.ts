import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase!: SupabaseClient;
  private connectionError = new BehaviorSubject<string | null>(null);

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    try {
      this.supabase = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            lock: async (_name, _acquireTimeout, fn) => fn()
          }
        }
      );
    } catch (error) {
      this.handleError('Failed to initialize Supabase client', error);
    }
  }

  private handleError(message: string, error: any) {
    const errorMessage = `${message}: ${error?.message || 'Unknown error'}`;
    this.connectionError.next(errorMessage);
    console.error(errorMessage, error);
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get error$(): Observable<string | null> {
    return this.connectionError.asObservable();
  }

  setError(error: string | null) {
    this.connectionError.next(error);
  }
}