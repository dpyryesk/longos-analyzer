import type {Metadata} from "next";
import "./globals.css";
import '../styles/colors_and_type.css';
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
    title: "Longo's Receipt Analyzer",
    description: "Analyze your Longo's grocery spending trends",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className="min-h-screen bg-gray-50 text-gray-900">
        <NavBar/>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </body>
        </html>
    );
}
