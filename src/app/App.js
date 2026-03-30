// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BudgetLayout from "../features/budget/pages/BudgetLayout";
import { SignInPage } from "../features/auth/pages/SignInPage";
import { SignUpPage } from "../features/auth/pages/SignUpPage";
import supabase from "../api/supabase";
import { fetchUserProfile } from "../api/authApi";

function PrivateRoute({ element, user }) {
  return user ? element : <Navigate to="/auth/signin" replace />;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const loadProfile = async (authUser) => {
    if (!authUser?.email) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await fetchUserProfile(authUser.email);
      setUserProfile(profile);
    } catch {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    // 초기 세션 확인 후 ready
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      setUser(authUser);
      await loadProfile(authUser);
      setReady(true);
    };
    init();

    // 로그인/로그아웃/토큰갱신 시 업데이트
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      loadProfile(authUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/signin" element={<SignInPage />} />
        <Route path="/auth/signup" element={<SignUpPage />} />
        <Route
          path="/budget"
          element={
            <PrivateRoute
              element={<BudgetLayout currentUser={userProfile} authUser={user} />}
              user={user}
            />
          }
        />
        <Route path="*" element={<Navigate to="/budget" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
