import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";

// Node memutus tiap percobaan koneksi setelah 250 ms. Di jaringan lambat atau tanpa IPv6, fetch ke Google (tukar kode login)
// gagal dengan ETIMEDOUT padahal servernya bisa dijangkau.
setDefaultAutoSelectFamilyAttemptTimeout(2000);
