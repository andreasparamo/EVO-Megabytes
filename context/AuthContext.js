"use client"; //Tells next.js to run on the client side

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/lib/firestoreService';

const AuthContext = createContext(); //Empty container that will hold authentication data and functions

export function useAuth(){ //Function that lets other components easily access auth data
    return useContext(AuthContext);
}

export function AuthProvider({children}){
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        }); //callback function to update state
        return unsubscribe; //stops listening to auth changed
    }, []);

const signup = async (email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Create user profile in Firestore
    await createUserProfile(userCredential.user.uid, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || "",
        stats: {
            averageWPM: 0,
            accuracy: 0,
            testsCompleted: 0,
            timePracticed: 0,
            bestWPM: 0,
            currentStreak: 0,
            lessonsCompleted: 0
        }
    });

    return userCredential;
};

const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);

    // Create user profile in Firestore if it doesn't exist (first time Google login)
    await createUserProfile(userCredential.user.uid, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || "",
        stats: {
            averageWPM: 0,
            accuracy: 0,
            testsCompleted: 0,
            timePracticed: 0,
            bestWPM: 0,
            currentStreak: 0,
            lessonsCompleted: 0
        }
    });

    return userCredential;
};

const logout = () => {
    try {
        localStorage.removeItem('ltt_settings');
        if (typeof document !== 'undefined') {
            Array.from(document.body.classList).forEach((c) => {
                if (c.startsWith('theme-')) document.body.classList.remove(c);
            });
            document.body.classList.add('theme-dark');
        }
    } catch (e) {}
    return signOut(auth);
};

const value = {
    user,
    signup,
    login,
    loginWithGoogle,
    logout,
    loading
  };

   return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


