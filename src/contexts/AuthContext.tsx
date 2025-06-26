import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { UserSubscription } from "@/types/lemonsqueezy";
import { getCompanySubscriptionByUserId, getUserSubscription } from "@/lib/api";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isInitializing: boolean; // Renamed from 'loading'
  logout: () => Promise<void>;
  subscription: UserSubscription | null;
  isSubscribed: boolean;
  refreshSubscription: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [isInitializing, setIsInitializing] = useState(true); // Renamed from 'loading'

  const fetchSubscription = async (currentUserId?: string) => {
    try {
      // Try to get subscription from edge function using raw fetch
      let accessToken = null;
      if (supabase.auth.getSession) {
        const session = await supabase.auth.getSession();
        accessToken = session?.data?.session?.access_token || null;
      }
      const result = await getCompanySubscriptionByUserId(currentUserId);
      setSubscription(result?.subscription);
    } catch (e) {
      console.error("AuthContext: Exception fetching subscription:", e);
      setSubscription(null);
    }
  };

  const refreshSubscription = async () => {
    if (user?.id) {
      await fetchSubscription(user.id);
    }
  };

  useEffect(() => {
    const processAuthChange = async (currentUser: User | null) => {
      setUser(currentUser);
      let fetchSubError = null;
      if (currentUser) {
        try {
          // Add a timeout to prevent hanging forever
          await Promise.race([
            fetchSubscription(currentUser.id),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("fetchSubscription timeout")),
                5000
              )
            ),
          ]);
        } catch (e) {
          fetchSubError = e;
          console.error(
            "AuthContext: processAuthChange - fetchSubscription error:",
            e
          );
          setSubscription(null);
        }
      } else {
        setSubscription(null);
      }

      setIsInitializing(false);
    };

    const getInitialAuthData = async () => {
      setIsInitializing(true); // Start initializing
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      console.log("currentSession->>", currentSession);
      await processAuthChange(currentSession?.user ?? null);
    };

    getInitialAuthData();

    const { data } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setIsInitializing(true); // Start initializing on any auth change
        setSession(newSession);
        await processAuthChange(newSession?.user ?? null);
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    console.log("AuthContext: logout called.");
    setIsInitializing(true); // Indicate state is changing
    await supabase.auth.signOut();
    // onAuthStateChange will handle setting user, session to null and fetching subscription (which will be null)
    // and then setIsInitializing to false.
  };

  const isSubscribed =
    !!subscription &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "past_due");

  const value = {
    session,
    user,
    isInitializing,
    logout,
    subscription,
    isSubscribed,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
