"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type User = { name: string } | null;

type UserContextValue = {
  user: User;
  login: (user: NonNullable<User>) => void;
  signOut: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("av_user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  const login = (u: NonNullable<User>) => {
    setUser(u);
    localStorage.setItem("av_user", JSON.stringify(u));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("av_user");
  };

  return (
    <UserContext.Provider value={{ user, login, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
