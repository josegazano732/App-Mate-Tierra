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
  private maxRetries = 5;
  private initialRetryDelay = 100;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    try {
      const retryOperation = this.retryOperation.bind(this);
      
      this.supabase = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            storage: {
              async getItem(key: string): Promise<string | null> {
                return retryOperation(async () => {
                  try {
                    return localStorage.getItem(key);
                  } catch (error) {
                    console.warn('LocalStorage getItem failed, retrying...', error);
                    throw error;
                  }
                });
              },
              async setItem(key: string, value: string): Promise<void> {
                return retryOperation(async () => {
                  try {
                    localStorage.setItem(key, value);
                    return Promise.resolve();
                  } catch (error) {
                    console.warn('LocalStorage setItem failed, retrying...', error);
                    throw error;
                  }
                });
              },
              async removeItem(key: string): Promise<void> {
                return retryOperation(async () => {
                  try {
                    localStorage.removeItem(key);
                    return Promise.resolve();
                  } catch (error) {
                    console.warn('LocalStorage removeItem failed, retrying...', error);
                    throw error;
                  }
                });
              }
            }
          }
        }
      );
    } catch (error) {
      this.handleError('Failed to initialize Supabase client', error);
    }
  }

  private async retryOperation<T>(operation: () => T | Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: any;
    
    while (attempt < this.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt++;
        
        if (attempt === this.maxRetries) {
          console.error(`Operation failed after ${this.maxRetries} attempts`, error);
          throw error;
        }
        
        const maxDelay = 5000;
        const baseDelay = this.initialRetryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 200;
        const delay = Math.min(baseDelay + jitter, maxDelay);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
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