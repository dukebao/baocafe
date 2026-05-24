import { createClient } from "@supabase/supabase-js";

const supabaseUrl = __SUPABASE_URL__;
const supabaseAnonKey = __SUPABASE_ANON_KEY__;

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from() {
        return {
          insert: async () => ({ error: new Error("Missing Supabase configuration.") }),
          select() {
            return this;
          },
          update() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return this;
          },
          then(resolve) {
            resolve({ data: [], error: new Error("Missing Supabase configuration.") });
          }
        };
      },
      channel() {
        return {
          on() {
            return this;
          },
          subscribe() {
            return this;
          }
        };
      },
      removeChannel: async () => {}
    };
