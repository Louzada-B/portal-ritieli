"use client";
import { createBrowserClient } from "@supabase/ssr";

// Cliente do navegador (sessão do painel). Usado só para os anexos cifrados do prontuário.
export const supabaseNavegador = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
