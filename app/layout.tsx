import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "./globals.css?url";
import { useInspectProtection } from "@features/portfolio/hooks/useInspectProtection";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

function InspectProtection() {
  useInspectProtection();
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-full">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function AppLayout() {
  return (
    <>
      <InspectProtection />
      <Outlet />
    </>
  );
}
