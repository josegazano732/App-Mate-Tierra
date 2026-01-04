import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private firestore!: Firestore;
  private auth!: Auth;
  private storage: any;
  private isOnline = new BehaviorSubject<boolean>(navigator.onLine);
  private connectionError = new BehaviorSubject<string | null>(null);

  constructor() {
    const firebaseConfig = {
      apiKey: "AIzaSyChUzXY3pKybBbSwCWJ_jOLumcD9XmrKN4",
      authDomain: "dbmate-3ab07.firebaseapp.com",
      projectId: "dbmate-3ab07",
      storageBucket: "dbmate-3ab07.appspot.com",
      messagingSenderId: "90382236660",
      appId: "1:90382236660:web:21de7991aa52cd069d97a1"
    };

    try {
      const app = initializeApp(firebaseConfig);
      this.firestore = getFirestore(app);
      this.auth = getAuth(app);
      this.storage = getStorage(app);

      this.enableOfflineSupport();
      this.monitorConnection();
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      this.connectionError.next('Error al inicializar Firebase. Por favor, recarga la página.');
    }
  }

  private async enableOfflineSupport() {
    try {
      await enableIndexedDbPersistence(this.firestore);
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
      }
    }
  }

  private monitorConnection() {
    window.addEventListener('online', () => this.isOnline.next(true));
    window.addEventListener('offline', () => this.isOnline.next(false));
  }

  getFirestore(): Firestore {
    return this.firestore;
  }

  getAuth(): Auth {
    return this.auth;
  }

  getStorage() {
    return this.storage;
  }

  getOnlineStatus(): Observable<boolean> {
    return this.isOnline.asObservable();
  }

  getConnectionError(): Observable<string | null> {
    return this.connectionError.asObservable();
  }
}