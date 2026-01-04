import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '@supabase/supabase-js';

export interface AppUser extends User {
  name?: string;
  age?: number;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject: BehaviorSubject<AppUser | null> = new BehaviorSubject<AppUser | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.loadUserProfile(session.user);
      } else {
        this.userSubject.next(null);
      }
    });
  }

  private async loadUserProfile(user: User) {
    try {
      const { data, error } = await this.supabase.client
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      const appUser: AppUser = {
        ...user,
        ...data
      };

      this.userSubject.next(appUser);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
  }

  async register(email: string, password: string, name: string, age: number): Promise<void> {
    try {
      const { data: { user }, error: signUpError } = await this.supabase.client.auth.signUp({
        email,
        password
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error('Registration failed - no user returned');

      const { error: profileError } = await this.supabase.client
        .from('users')
        .insert([
          {
            id: user.id,
            email,
            name,
            age,
            role: 'user'
          }
        ]);

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        await this.supabase.client.auth.signOut();
        throw new Error('Failed to create user profile');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
    this.userSubject.next(null);
  }

  isLoggedIn(): Observable<boolean> {
    return this.user$.pipe(map(user => !!user));
  }

  isAdmin(): Observable<boolean> {
    return this.user$.pipe(map(user => user?.role === 'admin'));
  }

  getUserName(): Observable<string | undefined> {
    return this.user$.pipe(map(user => user?.name));
  }
}