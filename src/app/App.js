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
  // undefined = 로딩 중, null = 미로그인, object = 로그인됨 (auth user)
  const [user, setUser] = useState(undefined);
  // public.users 프로필 (auth_email 기준으로 매칭된 레코드)
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
    // 앱 시작 시 기존 세션 확인 (로그아웃 전까지 유지됨)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      await loadProfile(authUser);
    });

    // 로그인/로그아웃 시 자동으로 상태 업데이트
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      await loadProfile(authUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 세션 확인 전까지 아무것도 렌더링하지 않음
  if (user === undefined) return null;

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
