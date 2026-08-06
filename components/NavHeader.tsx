"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

export default function NavHeader() {
  const { user, loading, logOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Image src="/Plek.svg" alt="Simple Plek" width={50} height={50} />
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
        </Link>

        {/* Nav Links */}
        <nav aria-label="Main" className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/bookings"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Bookings
          </Link>
          {!user?.isAdmin && (
            <Link
              href="/subscribe"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Become Pro
            </Link>
          )}
          {user?.isAdmin && (
            <Link
              href="/admin/properties"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
          )}

          <Separator orientation="vertical" className="h-6" />

          {/* Auth State Button */}
          {loading ? (
            <Spinner className="size-4 text-muted-foreground" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden flex-col items-end gap-0.5 sm:flex">
                <span className="text-sm font-medium leading-none">
                  {user.displayName || user.email?.split("@")[0]}
                </span>
                <span className="text-xs leading-none text-muted-foreground">{user.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={logOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
