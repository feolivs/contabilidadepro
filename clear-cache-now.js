const { createClient } = require("@supabase/supabase-js"); const { clearUrlCache } = require("./contador-solo-ai/src/lib/storage-utils.ts"); clearUrlCache(); console.log("Cache limpo!");
