// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BudgetLayout from "../features/budget/pages/BudgetLayout";
import { SignInPage } from "../features/auth/pages/SignInPage";
import { SignUpPage } from "../features/auth/pages/SignUpPage";
import { fetchUserProfile, restoreSession } from "../api/authApi";

function PrivateRoute({ element, user }) {
  return user ? element : <Navigate to="/auth/signin" replace />;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const loadProfile = async (sessionUser) => {
    if (!sessionUser?.id) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await fetchUserProfile(sessionUser.id);
      setUserProfile(profile);
    } catch {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      const restored = await restoreSession();
      const sessionUser = restored?.user ?? null;
      setUser(sessionUser);
      await loadProfile(sessionUser);
      setReady(true);
    };
    init();
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
              element={<BudgetLayout currentUser={userProfile} authUser={null} />}
              user={user}
            />
          }
        />
        <Route path="*" element={<Navigate to="/budget" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
