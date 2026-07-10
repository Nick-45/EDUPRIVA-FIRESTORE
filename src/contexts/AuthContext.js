import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase/config';
import {
signInWithEmailAndPassword,
signOut,
onAuthStateChanged
} from 'firebase/auth';
import {
doc,
getDoc,
setDoc
} from 'firebase/firestore';

const AuthContext = createContext();
const STORAGE_KEY = 'edupriva_auth_context';

export const useAuth = () => useContext(AuthContext);

// ------------------ Helpers ------------------

const persistAuthState = (data) => {
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify({
...data,
expiresAt: Date.now() + 24 * 60 * 60 * 1000
}));
} catch {}
};

const restoreAuthState = () => {
try {
const raw = localStorage.getItem(STORAGE_KEY);
if (!raw) return null;
const parsed = JSON.parse(raw);
if (parsed.expiresAt < Date.now()) return null;
return parsed;
} catch {
return null;
}
};

const clearPersistedState = () => {
localStorage.removeItem(STORAGE_KEY);
};

// ------------------ Firestore Loaders ------------------

const loadUser = async (uid, email) => {
const ref = doc(db, 'users', uid);
const snap = await getDoc(ref);

if (!snap.exists()) {
const defaultRole =
email === '[info.edupriva@gmail.com](mailto:info.edupriva@gmail.com)'
? 'platform_admin'
: 'school_admin';

```
const newUser = {
  email,
  role: defaultRole,
  status: 'active',
  created_at: new Date().toISOString()
};

await setDoc(ref, newUser);
return newUser;
```

}

return snap.data();
};

const loadSchool = async (schoolId) => {
if (!schoolId) return null;
const snap = await getDoc(doc(db, 'schools', schoolId));
return snap.exists() ? snap.data() : null;
};

const loadSchoolProfile = async (uid) => {
const snap = await getDoc(doc(db, 'school_profiles', uid));
return snap.exists() ? snap.data() : null;
};

// ------------------ Provider ------------------

export const AuthProvider = ({ children }) => {
const [user, setUser] = useState(null);
const [userData, setUserData] = useState(null);
const [schoolData, setSchoolData] = useState(null);
const [schoolProfile, setSchoolProfile] = useState(null);
const [role, setRole] = useState(null);
const [loading, setLoading] = useState(true);

const loadFullProfile = async (firebaseUser) => {
const userData = await loadUser(firebaseUser.uid, firebaseUser.email);

```
const isPlatformAdmin = userData.role === 'platform_admin';

let school = null;
let profile = null;

if (!isPlatformAdmin) {
  profile = await loadSchoolProfile(firebaseUser.uid);
  const schoolId = userData.school_id || profile?.school_id;
  school = await loadSchool(schoolId);
}

setUser(firebaseUser);
setUserData(userData);
setSchoolData(school);
setSchoolProfile(profile);
setRole(userData.role);

persistAuthState({
  uid: firebaseUser.uid,
  userData,
  school,
  profile,
  role: userData.role
});
```

};

useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
setLoading(true);

```
  if (firebaseUser) {
    await loadFullProfile(firebaseUser);
  } else {
    const stored = restoreAuthState();
    if (!stored) {
      setUser(null);
      setUserData(null);
      setSchoolData(null);
      setSchoolProfile(null);
      setRole(null);
      clearPersistedState();
    }
  }

  setLoading(false);
});

return unsubscribe;
```

}, []);

// ------------------ Actions ------------------

const login = async (email, password) => {
const res = await signInWithEmailAndPassword(auth, email, password);
await loadFullProfile(res.user);
};

const logout = async () => {
await signOut(auth);
setUser(null);
setUserData(null);
setSchoolData(null);
setSchoolProfile(null);
setRole(null);
clearPersistedState();
};

const refreshUser = async () => {
if (auth.currentUser) {
await loadFullProfile(auth.currentUser);
}
};

// ------------------ Value ------------------

const value = {
user,
userData,
schoolData,
schoolProfile,
role,
loading,
login,
logout,
refreshUser,
isAuthenticated: !!user
};

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
