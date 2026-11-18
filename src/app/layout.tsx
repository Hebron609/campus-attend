import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIT Attendance Management System | Accra Institute of Technology",
  description: "CS403 Student Attendance Management System for Administrators, Lecturers, and Students.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50 antialiased">
      <body className="min-h-full flex flex-col font-sans text-slate-900 bg-slate-50">
        {children}
      </body>
    </html>
  );
}
