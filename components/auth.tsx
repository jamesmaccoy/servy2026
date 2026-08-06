"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ActionCodeSettings,
  type ApplicationVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { CheckCircle2Icon, PhoneIcon, TriangleAlertIcon } from "lucide-react";

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
  phoneNumber: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  sendEmailLink: (email: string) => Promise<void>;
  confirmEmailLinkSignIn: (email: string) => Promise<void>;
  sendPhoneVerificationCode: (phoneNumber: string, appVerifier: ApplicationVerifier) => Promise<void>;
  confirmPhoneVerificationCode: (code: string) => Promise<void>;
  resetPhoneVerification: () => void;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  isMockUser: boolean;
  authError: string | null;
  clearAuthError: () => void;
  emailLinkSent: boolean;
  emailLinkPending: boolean;
  phoneCodeSent: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const EMAIL_FOR_SIGN_IN_KEY = "emailForSignIn";

function getEmailLinkSettings(): ActionCodeSettings {
  const loginUrl = new URL("/login", window.location.origin);
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (redirect) {
    loginUrl.searchParams.set("redirect", redirect);
  }
  return {
    url: loginUrl.toString(),
    handleCodeInApp: true,
  };
}

function cleanEmailLinkUrl() {
  const url = new URL(window.location.href);
  const redirect = url.searchParams.get("redirect");
  const cleanPath = redirect
    ? `${window.location.pathname}?redirect=${encodeURIComponent(redirect)}`
    : window.location.pathname;
  window.history.replaceState({}, document.title, cleanPath);
}

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

function createMockSession(email: string): AuthUser {
  const isUserAdminMock =
    email.toLowerCase().includes("admin") ||
    email.toLowerCase() === "thankyou.digital@gmail.com";
  return {
    uid: `mock_${email.replace(/[^\w]/g, "_")}`,
    email,
    phoneNumber: null,
    displayName: email.split("@")[0],
    isAnonymous: false,
    isAdmin: isUserAdminMock,
  };
}

function createMockPhoneSession(phoneNumber: string): AuthUser {
  return {
    uid: `mock_phone_${phoneNumber.replace(/\D/g, "")}`,
    email: null,
    phoneNumber,
    displayName: phoneNumber,
    isAnonymous: false,
    isAdmin: false,
  };
}

/** Normalize to E.164. Defaults local SA numbers (0…) to +27. */
function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.startsWith("0")) {
    return `+27${digits.slice(1)}`;
  }
  if (digits.startsWith("27")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

function formatAuthIdentity(user: AuthUser) {
  return user.email || user.phoneNumber || user.displayName || "Account";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockUser, setIsMockUser] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [emailLinkPending, setEmailLinkPending] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const phoneConfirmationRef = useRef<ConfirmationResult | null>(null);

  const clearAuthError = () => setAuthError(null);

  const finishEmailLinkSignIn = async (email: string) => {
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
    setEmailLinkPending(false);
    setEmailLinkSent(false);
    cleanEmailLinkUrl();
  };

  useEffect(() => {
    const completeEmailLinkSignIn = async () => {
      if (typeof window === "undefined") return;
      if (!isSignInWithEmailLink(auth, window.location.href)) return;

      const storedEmail = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
      if (!storedEmail) {
        setEmailLinkPending(true);
        return;
      }

      setLoading(true);
      try {
        await finishEmailLinkSignIn(storedEmail);
      } catch (err) {
        console.error("Error completing email link sign-in:", err);
        setAuthError(err instanceof Error ? err.message : String(err));
        setEmailLinkPending(true);
      } finally {
        setLoading(false);
      }
    };

    void completeEmailLinkSignIn();

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const initialUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            phoneNumber: firebaseUser.phoneNumber,
            displayName: firebaseUser.displayName,
            isAnonymous: firebaseUser.isAnonymous,
            isAdmin: false,
          };
          setUser(initialUser);
          setIsMockUser(false);
          setLoading(false);

          try {
            const res = await fetch(
              `/api/user/profile?userId=${firebaseUser.uid}&email=${firebaseUser.email || ""}`
            );
            const result = await res.json();
            if (result.success && result.data) {
              setUser((prev) =>
                prev && prev.uid === firebaseUser.uid
                  ? { ...prev, isAdmin: result.data.isAdmin }
                  : prev
              );
            }
          } catch (err) {
            console.error("Failed to query profile for admin status:", err);
          }
        } else {
          const localSession = isMockAllowed()
            ? localStorage.getItem("auth:mock_session")
            : null;
          if (localSession) {
            const parsedUser = JSON.parse(localSession);
            setUser(parsedUser);
            setIsMockUser(true);
            setLoading(false);

            try {
              const res = await fetch(
                `/api/user/profile?userId=${parsedUser.uid}&email=${parsedUser.email || ""}`
              );
              const result = await res.json();
              if (result.success && result.data) {
                const updatedAdmin = result.data.isAdmin;
                setUser((prev) => {
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

  const sendEmailLink = async (email: string) => {
    setLoading(true);
    clearAuthError();
    try {
      await sendSignInLinkToEmail(auth, email, getEmailLinkSettings());
      window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
      setEmailLinkSent(true);
    } catch (err) {
      console.warn(`[Firebase Auth] Email link failed: ${err instanceof Error ? err.message : String(err)}`);
      if (!isMockAllowed()) {
        throw err;
      }
      console.warn("[Firebase Auth] Trying offline mock email link fallback.");
      const mockSession = createMockSession(email);
      localStorage.setItem("auth:mock_session", JSON.stringify(mockSession));
      setUser(mockSession);
      setIsMockUser(true);
    } finally {
      setLoading(false);
    }
  };

  const confirmEmailLinkSignIn = async (email: string) => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      throw new Error("This sign-in link is invalid or has expired.");
    }

    setLoading(true);
    clearAuthError();
    try {
      await finishEmailLinkSignIn(email);
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneVerificationCode = async (
    phoneNumber: string,
    appVerifier: ApplicationVerifier
  ) => {
    setLoading(true);
    clearAuthError();
    try {
      const normalized = normalizePhoneNumber(phoneNumber);
      const result = await signInWithPhoneNumber(auth, normalized, appVerifier);
      phoneConfirmationRef.current = result;
      setPhoneCodeSent(true);
    } catch (err) {
      console.warn(
        `[Firebase Auth] Phone verification failed: ${err instanceof Error ? err.message : String(err)}`
      );
      if (!isMockAllowed()) {
        throw err;
      }
      console.warn("[Firebase Auth] Trying offline mock phone login fallback.");
      const normalized = normalizePhoneNumber(phoneNumber);
      const mockSession = createMockPhoneSession(normalized);
      localStorage.setItem("auth:mock_session", JSON.stringify(mockSession));
      setUser(mockSession);
      setIsMockUser(true);
      phoneConfirmationRef.current = null;
      setPhoneCodeSent(false);
    } finally {
      setLoading(false);
    }
  };

  const confirmPhoneVerificationCode = async (code: string) => {
    if (!phoneConfirmationRef.current) {
      throw new Error("Request a verification code first.");
    }

    setLoading(true);
    clearAuthError();
    try {
      await phoneConfirmationRef.current.confirm(code);
      phoneConfirmationRef.current = null;
      setPhoneCodeSent(false);
    } finally {
      setLoading(false);
    }
  };

  const resetPhoneVerification = () => {
    phoneConfirmationRef.current = null;
    setPhoneCodeSent(false);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.warn(`[Firebase Auth] Google login failed: ${err instanceof Error ? err.message : String(err)}`);
      if (!isMockAllowed()) {
        throw err;
      }
      console.warn("[Firebase Auth] Trying offline mock Google login fallback.");

      let devEmail = "google-guest@example.com";
      if (typeof window !== "undefined") {
        const entered = prompt("Enter email for mock Google sign-in:", "google-guest@example.com");
        if (entered) {
          devEmail = entered;
        }
      }

      const mockSession: AuthUser = {
        uid: "mock_google_user",
        email: devEmail,
        phoneNumber: null,
        displayName: devEmail.split("@")[0] || "Google Guest",
        isAnonymous: false,
        isAdmin: false,
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
    localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
    setUser(null);
    setIsMockUser(false);
    setEmailLinkSent(false);
    setEmailLinkPending(false);
    resetPhoneVerification();
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sendEmailLink,
        confirmEmailLinkSignIn,
        sendPhoneVerificationCode,
        confirmPhoneVerificationCode,
        resetPhoneVerification,
        signInWithGoogle,
        logOut,
        isMockUser,
        authError,
        clearAuthError,
        emailLinkSent,
        emailLinkPending,
        phoneCodeSent,
      }}
    >
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

export function AuthCard() {
  const {
    user,
    sendEmailLink,
    confirmEmailLinkSignIn,
    sendPhoneVerificationCode,
    confirmPhoneVerificationCode,
    resetPhoneVerification,
    signInWithGoogle,
    logOut,
    loading,
    isMockUser,
    authError,
    clearAuthError,
    emailLinkSent,
    emailLinkPending,
    phoneCodeSent,
  } = useAuth();
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [recaptchaKey, setRecaptchaKey] = useState(0);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (authMethod !== "phone") {
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
      return;
    }

    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "normal",
    });
    recaptchaVerifierRef.current = verifier;

    return () => {
      verifier.clear();
      recaptchaVerifierRef.current = null;
    };
  }, [authMethod, recaptchaKey]);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setFormError("Please enter your email address.");
      return;
    }
    setFormError(null);
    clearAuthError();
    try {
      await sendEmailLink(email);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to send sign-in link.");
    }
  };

  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setFormError("Please enter your phone number.");
      return;
    }
    if (!recaptchaVerifierRef.current) {
      setFormError("Verification check is still loading. Please try again.");
      return;
    }
    setFormError(null);
    clearAuthError();
    try {
      await sendPhoneVerificationCode(phone, recaptchaVerifierRef.current);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to send verification code.");
      setRecaptchaKey((key) => key + 1);
    }
  };

  const handleConfirmPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setFormError("Please enter the verification code.");
      return;
    }
    setFormError(null);
    clearAuthError();
    try {
      await confirmPhoneVerificationCode(verificationCode);
      setVerificationCode("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Verification code is invalid.");
    }
  };

  const handleConfirmEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setFormError("Please enter the email address that received the link.");
      return;
    }
    setFormError(null);
    clearAuthError();
    try {
      await confirmEmailLinkSignIn(email);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign-in link confirmation failed.");
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Google authentication failed.");
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
            <p className="font-heading text-sm font-medium">{formatAuthIdentity(user)}</p>
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

  if (emailLinkPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Confirm your email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Opened the sign-in link on a different device? Enter the email address that received the
            link to finish signing in.
          </p>

          {(formError || authError) && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{formError || authError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleConfirmEmailLink} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-email-confirm">Email address</Label>
              <Input
                id="auth-email-confirm"
                type="email"
                autoComplete="email"
                required
                placeholder="e.g. guest@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Complete sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <ToggleGroup
          aria-label="Sign-in method"
          value={[authMethod]}
          onValueChange={(value) => {
            const next = value[0];
            if (next !== "email" && next !== "phone") return;
            setAuthMethod(next);
            setFormError(null);
            clearAuthError();
            resetPhoneVerification();
            setVerificationCode("");
          }}
          className="grid w-full grid-cols-2"
        >
          <ToggleGroupItem value="email">Email link</ToggleGroupItem>
          <ToggleGroupItem value="phone">Phone</ToggleGroupItem>
        </ToggleGroup>

        <CardTitle className="text-sm">
          {authMethod === "email" ? "Sign in with email" : "Sign in with phone"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {authMethod === "email"
            ? "We'll email you a secure link. No password needed — works for new and existing accounts."
            : "We'll SMS you a one-time code. Standard message rates may apply."}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {authMethod === "email" && emailLinkSent && (
          <Alert>
            <CheckCircle2Icon />
            <AlertDescription>
              Check your inbox for a sign-in link sent to <strong>{email}</strong>.
            </AlertDescription>
          </Alert>
        )}

        {authMethod === "phone" && phoneCodeSent && (
          <Alert>
            <CheckCircle2Icon />
            <AlertDescription>
              Enter the 6-digit code sent to <strong>{normalizePhoneNumber(phone)}</strong>.
            </AlertDescription>
          </Alert>
        )}

        {(formError || authError) && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{formError || authError}</AlertDescription>
          </Alert>
        )}

        {authMethod === "email" ? (
          <form onSubmit={handleSendLink} className="flex flex-col gap-4">
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
            <Button type="submit" className="w-full">
              {emailLinkSent ? "Resend sign-in link" : "Send sign-in link"}
            </Button>
          </form>
        ) : phoneCodeSent ? (
          <form onSubmit={handleConfirmPhoneCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-phone-code">Verification code</Label>
              <Input
                id="auth-phone-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="123456"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button type="submit" className="w-full">
              Verify and sign in
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                resetPhoneVerification();
                setVerificationCode("");
                setFormError(null);
              }}
            >
              Use a different number
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSendPhoneCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-phone">Phone number</Label>
              <Input
                id="auth-phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="+27 82 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div key={recaptchaKey} id="recaptcha-container" />
            <Button type="submit" className="w-full">
              <PhoneIcon className="size-4" />
              Send verification code
            </Button>
          </form>
        )}

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
