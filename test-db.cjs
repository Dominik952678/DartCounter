const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pdbycflxxokbwfsfrmwu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vkBLAop52YK5pN6JrIAjfQ__Q9dvli0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDatabase() {
  console.log("Starte Datenbank-Test...");

  // 1. Write Test
  console.log("Schreibe Test-Daten...");
  const { error: writeError } = await supabase
    .from('documents')
    .upsert({ 
      id: 'test_connection', 
      data: { status: 'success', timestamp: new Date().toISOString() } 
    });

  if (writeError) {
    console.error("❌ Fehler beim Schreiben:", writeError.message);
    console.error("Hast du das SQL-Skript im Supabase SQL-Editor ausgeführt?");
    return;
  }
  console.log("✅ Schreiben erfolgreich!");

  // 2. Read Test
  console.log("Lese Test-Daten...");
  const { data, error: readError } = await supabase
    .from('documents')
    .select('data')
    .eq('id', 'test_connection')
    .single();

  if (readError) {
    console.error("❌ Fehler beim Lesen:", readError.message);
    return;
  }
  
  if (data) {
    console.log("✅ Lesen erfolgreich! Daten:", data.data);
    console.log("🎉 Die Datenbank funktioniert einwandfrei!");
  } else {
    console.log("❌ Keine Daten gefunden.");
  }
}

testDatabase();
