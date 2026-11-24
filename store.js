// Two interchangeable task stores with the same API:
//   subscribe(cb) -> unsubscribe,  put(task),  remove(id)
// LocalStore keeps tasks on this device. CloudStore syncs them through Firestore.

const LS_KEY = 'todo-tasks';
const FIREBASE_VERSION = '11.0.2';

export class LocalStore {
  constructor() {
    this.tasks = LocalStore.read();
    this.listeners = new Set();
    addEventListener('storage', (e) => {
      if (e.key === LS_KEY) { this.tasks = LocalStore.read(); this.emit(); }
    });
  }
  static read() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; }
  }
  static clear() {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
  }
  save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.tasks)); } catch (e) {}
    this.emit();
  }
  emit() { for (const cb of this.listeners) cb(this.tasks.slice()); }
  subscribe(cb) { this.listeners.add(cb); cb(this.tasks.slice()); return () => this.listeners.delete(cb); }
  put(task) {
    const i = this.tasks.findIndex((t) => t.id === task.id);
    if (i >= 0) this.tasks[i] = { ...task }; else this.tasks.push({ ...task });
    this.save();
  }
  remove(id) { this.tasks = this.tasks.filter((t) => t.id !== id); this.save(); }
}

class CloudStore {
  constructor(fs, db, uid) {
    this.fs = fs;
    this.col = fs.collection(db, 'users', uid, 'tasks');
  }
  subscribe(cb, onError) {
    return this.fs.onSnapshot(this.col, (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))), onError);
  }
  put(task) { return this.fs.setDoc(this.fs.doc(this.col, task.id), task); }
  remove(id) { return this.fs.deleteDoc(this.fs.doc(this.col, id)); }
}

/** Loads Firebase from Google's CDN only when a config exists. */
export async function initFirebase(config) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [appMod, authMod, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(config);
  const auth = authMod.getAuth(app);
  let db;
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch (e) {
    db = fs.getFirestore(app);
  }
  authMod.getRedirectResult(auth).catch(() => {});

  return {
    onUser(cb) { return authMod.onAuthStateChanged(auth, cb); },
    async signIn() {
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await authMod.signInWithPopup(auth, provider);
      } catch (err) {
        const fallback = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'];
        if (fallback.includes(err.code)) return authMod.signInWithRedirect(auth, provider);
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
        throw err;
      }
    },
    signOut() { return authMod.signOut(auth); },
    cloudStore(uid) { return new CloudStore(fs, db, uid); },
  };
}
