import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://heaihotsjwpogszxzklc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlYWlob3Rzandwb2dzenh6a2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjY0NDEsImV4cCI6MjA5NDIwMjQ0MX0.5QX60x5RFQ_--85VpF_L8pxO_LHyYuywCU9ffRqpO1Q";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
