import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { UserSubscription } from "@/types/lemonsqueezy";

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
    // console.log("currentUserId ->>", currentUserId);
    // const userIdToFetch = currentUserId || user?.id;
    // if (!userIdToFetch) {
    //   setSubscription(null);
    //   return; // Explicitly return if no user ID
    // }

    try {
      // Try to get subscription from edge function using raw fetch
      let accessToken = null;
      if (supabase.auth.getSession) {
        const session = await supabase.auth.getSession();
        accessToken = session?.data?.session?.access_token || null;
      }
      const functionUrl =
        "https://szfmzdhzdclxugzqejfc.supabase.co/functions/v1/get-lemon-squeezy-subscription-portal";
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        // body: JSON.stringify({ userId: userIdToFetch }),
      });
      if (res.ok) {
        const portalData = await res.json();
        console.log("portalData->>", portalData);
        if (portalData && portalData.productInfo) {
          setSubscription(portalData.productInfo as UserSubscription);
          return;
        }
      } else {
        const errorText = await res.text();
        console.error(
          "AuthContext: Error from get-lemon-squeezy-subscription-portal:",
          errorText
        );
      }
      // Fallback to old method if edge function fails or returns nothing
      // const { data, error } = await supabase
      //   .from("subscriptions")
      //   .select("*")
      //   .eq("user_id", userIdToFetch)
      //   .in("status", ["active", "trialing", "past_due"]) // Consider 'past_due' as potentially subscribed for grace periods
      //   .order("created_at", { ascending: false }) // Get the latest relevant subscription
      //   .limit(1)
      //   .single();
      // if (error && error.code !== "PGRST116") {
      //   // PGRST116 means no rows found, which is not an error here
      //   console.error("AuthContext: Error fetching subscription:", error);
      //   setSubscription(null);
      // } else {
      //   console.log("AuthContext: Fetched subscription data:", data);
      //   setSubscription(data as UserSubscription | null);
      // }
    } catch (e) {
      console.error("AuthContext: Exception fetching subscription:", e);
      setSubscription(null);
    }
  };

  // const fetchSubscription = async (currentUserId?: string) => {
  //   const userIdToFetch = currentUserId || user?.id;
  //   if (!userIdToFetch) {
  //     console.log(
  //       "AuthContext: fetchSubscription - No user ID, setting subscription to null."
  //     );
  //     setSubscription(null);
  //     return; // Explicitly return if no user ID
  //   }
  //   console.log(
  //     "AuthContext: fetchSubscription - Fetching for user ID:",
  //     userIdToFetch
  //   );
  //   try {
  //     const { data, error } = await supabase
  //       .from("subscriptions")
  //       .select("*")
  //       .eq("user_id", userIdToFetch)
  //       .in("status", ["active", "trialing", "past_due"]) // Consider 'past_due' as potentially subscribed for grace periods
  //       .order("created_at", { ascending: false }) // Get the latest relevant subscription
  //       .limit(1)
  //       .single();

  //     if (error && error.code !== "PGRST116") {
  //       // PGRST116 means no rows found, which is not an error here
  //       console.error("AuthContext: Error fetching subscription:", error);
  //       setSubscription(null);
  //     } else {
  //       console.log("AuthContext: Fetched subscription data:", data);
  //       setSubscription(data as UserSubscription | null);
  //     }
  //   } catch (e) {
  //     console.error("AuthContext: Exception fetching subscription:", e);
  //     setSubscription(null);
  //   }
  // };

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
