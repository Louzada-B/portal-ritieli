import "server-only";
import { supabaseServidor } from "./supabase/servidor";

// Confere se quem chama é a administradora logada.
export async function ehAdmin() {
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  if (!data.user) return false;
  const { data: adm } = await sb.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return !!adm;
}
