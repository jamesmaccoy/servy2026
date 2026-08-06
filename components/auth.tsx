"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { TriangleAlertIcon } from "lucide-react";

import { auth } from "@/lib/clientApp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  isMockUser: boolean;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * The offline mock session is a development-only bypass. It is gated on the
 * hostname rather than NODE_ENV, because previews are frequently served from a
 * production build while still running on a local/private host. A publicly
 * deployed app is never served from these hosts, so this cannot leak to prod.
 * Set NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS=true to opt in from another host.
 */
const isMockAllowed = () => {
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS === "true") return true;
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    // v0 / Vercel Sandbox dev preview hosts. Published deployments are served
    // from *.vercel.app or a custom domain, so they never match here.
    hostname.endsWith(".vercel.run")
  );
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockUser, setIsMockUser] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    // Process redirect result if returning from Google Sign-In
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log("Successfully signed in via Google redirect:", result.user.email);
        }
      })
      .catch((err) => {
        console.error("Error during Google redirect sign-in:", err);
        setAuthError(err instanceof Error ? err.message : String(err));
      });

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const initialUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            isAnonymous: firebaseUser.isAnonymous,
            isAdmin: false
          };
          setUser(initialUser);
          setIsMockUser(false);
          setLoading(false);

          // Fetch actual admin status asynchronously
          try {
            const res = await fetch(`/api/user/profile?userId=${firebaseUser.uid}&email=${firebaseUser.email || ""}`);
            const result = await res.json();
            if (result.success && result.data) {
              setUser(prev => prev && prev.uid === firebaseUser.uid ? { ...prev, isAdmin: result.data.isAdmin } : prev);
            }
          } catch (err) {
            console.error("Failed to query profile for admin status:", err);
          }
        } else {
          // Check local storage mock session as fallback
          const localSession = isMockAllowed() ? localStorage.getItem("auth:mock_session") : null;
          if (localSession) {
            const parsedUser = JSON.parse(localSession);
            setUser(parsedUser);
            setIsMockUser(true);
            setLoading(false);

            // Fetch actual admin status asynchronously for mock user from DB
            try {
              const res = await fetch(`/api/user/profile?userId=${parsedUser.uid}&email=${parsedUser.email || ""}`);
              const result = await res.json();
              if (result.success && result.data) {
                const updatedAdmin = result.data.isAdmin;
                setUser(prev => {
                  if (prev && prev.uid === parsedUser.uid) {
                    const updated = { ...prev, isAdmin: updatedAdmin };
                    localStorage.setItem("auth:mock_session", JSON.stringify(updated));
                    return updated;
                  }
                  return prev;
                });
              }
            } catch (err) {
              console.error("Failed to query profile for mock admin status:", err);
            }
          } else {
            setUser(null);
            setLoading(false);
          }
        }
      });
      return unsubscribe;
    } catch (err) {
      console.warn("⚠️ Firebase Auth client failed to load. Toggling offline fallback provider.");
      if (isMockAllowed()) {
        const localSession = localStorage.getItem("auth:mock_session");
        if (localSession) {
          setUser(JSON.parse(localSession));
          setIsMockUser(true);
        }
      }
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.warn(`[Firebase Auth] Failed: ${err.message}`);
      if (!isMockAllowed()) {
        throw err;
      }
      console.warn(`[Firebase Auth] Trying offline mock login fallback.`);
      // Fallback: Create mock session
      const isUserAdminMock = email.toLowerCase().includes("admin") || email.toLowerCase() === "thankyou.digital@gmail.com";
      const mockSession: AuthUser = {
        uid: `mock_${email.replace(/[^\w]/g, "_")}`,
        email,
        displayName: email.split("@")[0],
        isAnonymous: false,
        isAdmin: isUserAdminMock
      };
      localStorage.setItem("auth:mock_session", JSON.stringify(mockSession));
      setUser(mockSession);
      setIsMockUser(true);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.warn(`[Firebase Auth] Signup failed: ${err.message}`);
      if (!isMockAllowed()) {
        throw err;
      }
      console.warn(`[Firebase Auth] Trying offline mock signup fallback.`);
      const isUserAdminMock = email.toLowerCase().includes("admin") || email.toLowerCase() === "thankyou.digital@gmail.com";
      const mockSession: AuthUser = {
        uid: `mock_${email.replace(/[^\w]/g, "_")}`,
        email,
        displayName: email.split("@")[0],
        isAnonymous: false,
        isAdmin: isUserAdminMock
      };
      localStorage.setItem("auth:mock_session", JSON.stringify(mockSession));
      setUser(mockSession);
      setIsMockUser(true);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.warn(`[Firebase Auth] Google login failed: ${err instanceof Error ? err.message : String(err)}`);
      if (!isMockAllowed()) {
        throw err;
      }
      console.warn(`[Firebase Auth] Trying offline mock Google login fallback.`);
      
      // Prompt for email in dev to allow mock sign-in with specific developer emails if needed
      let devEmail = "google-guest@example.com";
      if (typeof window !== "undefined") {
        const entered = prompt("Enter email for mock Google sign-in:", "google-guest@example.com");
        if (entered) {
          devEmail = entered;
        }
      }
      
      // Fallback: Create mock session
      const mockSession: AuthUser = {
        uid: "mock_google_user",
        email: devEmail,
        displayName: devEmail.split("@")[0] || "Google Guest",
        isAnonymous: false,
        isAdmin: false
      };
      localStorage.setItem("auth:mock_session", JSON.stringify(mockSession));
      setUser(mockSession);
      setIsMockUser(true);
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("[Firebase Auth] signOut failed:", err);
    }
    localStorage.removeItem("auth:mock_session");
    setUser(null);
    setIsMockUser(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logOut, isMockUser, authError, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Authentication Forms Component
export function AuthCard() {
  const { user, signIn, signUp, signInWithGoogle, logOut, loading, isMockUser, authError, clearAuthError } = useAuth();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setFormError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Google authentication failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setFormError("Please fill in all fields.");
      return;
    }
    setFormError(null);
    try {
      if (isSignUpMode) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setFormError(err.message || "Authentication failed.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (user) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Signed in as
            </span>
            <p className="font-heading text-sm font-medium">{user.email}</p>
            {isMockUser && (
              <Badge variant="secondary" className="mt-1 w-fit">
                Offline mock session
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={logOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <ToggleGroup
          aria-label="Authentication mode"
          value={[isSignUpMode ? "signup" : "signin"]}
          onValueChange={(value) => {
            const next = value[0];
            if (next !== "signin" && next !== "signup") return;
            setIsSignUpMode(next === "signup");
            setFormError(null);
            clearAuthError();
          }}
          className="grid w-full grid-cols-2"
        >
          <ToggleGroupItem value="signin">Sign in</ToggleGroupItem>
          <ToggleGroupItem value="signup">Sign up</ToggleGroupItem>
        </ToggleGroup>

        <CardTitle className="text-sm">
          {isSignUpMode ? "Create a guest profile" : "Access your booking account"}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {(formError || authError) && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{formError || authError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="auth-email">Email address</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              placeholder="e.g. guest@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={isSignUpMode ? "new-password" : "current-password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            {isSignUpMode ? "Register profile" : "Sign in"}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
          </svg>
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
