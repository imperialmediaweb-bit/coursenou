---
name: qa-cb-plati
description: Testează conturile, planurile și plățile din Coursbit — Free vs Pro vs Pro Yearly, limitele fiecărui plan, abonarea, reînnoirea, anularea, downgrade-ul, cardurile refuzate și ce se întâmplă cu cursurile la expirare. Folosește-l ori de câte ori se testează abonamentul, Stripe, limitele de plan, upgrade sau anulare.
---

# QA — Conturi, planuri, plăți

Locul cu cele mai scumpe bug-uri: cineva plătește și nu primește acces, sau nu plătește și primește.

## 1. Limitele de plan (fiecare limită se testează și prin API direct)

Din ofertă: Free = 10 cursuri cu imagini, 5 topicuri/curs, PDF, quiz, certificat. Pro = nelimitat, video, 20 topicuri, audio, PPT, chatbot.

| ID | Test | Așteptat |
|---|---|---|
| PLN-01 🔴 | Free încearcă al 11-lea curs | Blocat în interfață ȘI la apel direct la API |
| PLN-02 🔴 | Free cere 6 topicuri | Blocat |
| PLN-03 🔴 | Free cere audio / PPT / chatbot / video | Blocate toate patru, individual, prin API |
| PLN-04 | Free șterge un curs | Vezi CST-03 — decide dacă eliberează un loc |
| PLN-05 | Pro expiră cu 40 de cursuri făcute | Cursurile RĂMÂN accesibile (sau politica e scrisă clar înainte de plată). Ștergerea lor = furt perceput |
| PLN-06 | Pro → Free (downgrade) | Ce se întâmplă cu audio-ul și cursurile video deja generate? Decide și scrie în Termeni |
| PLN-07 | Upgrade la mijlocul lunii | Proraționare corectă, acces imediat |
| PLN-08 | Yearly (6,58$/lună, „economisești 40%") | Verifică matematica afișată: 12$ vs 6,58$ e 45%, nu 40%. Corectează pagina sau prețul — o cifră greșită pe pagina de prețuri e primul lucru pe care îl observă cineva care evaluează produsul |

## 2. Fluxul de plată

| ID | Test | Așteptat |
|---|---|---|
| PAY-01 @smoke | Plată reușită cu card de test | Acces Pro imediat, factură trimisă |
| PAY-02 🔴 | Card refuzat | Mesaj clar, contul rămâne Free, nu se blochează |
| PAY-03 🔴 | Plata reușește dar webhook-ul eșuează | Utilizatorul primește totuși Pro. Ăsta e bug-ul clasic care generează cele mai furioase emailuri. Testează oprind webhook-ul intenționat |
| PAY-04 | Webhook trimis de două ori | Nu se taxează dublu, nu se prelungește dublu |
| PAY-05 | 3D Secure / autentificare bancară | Fluxul se termină corect |
| PAY-06 🔴 | Anulare abonament | Acces până la finalul perioadei plătite, apoi Free. Nu se taie instant după ce a plătit luna |
| PAY-07 | Reînnoire eșuată (card expirat) | Email de avertizare, perioadă de grație, nu tăiere bruscă |
| PAY-08 | Rambursare din Stripe | Contul trece pe Free automat |
| PAY-09 | Utilizator plătește de pe două dispozitive simultan | Un singur abonament |
| PAY-10 | Factură fiscală | Conformă cu ce ai nevoie ca firmă din România; TVA corect pentru clienți din UE și din afara UE (OSS) |
| PAY-11 | Schimbare de preț viitoare | Clienții vechi rămân la prețul vechi? Scrie regula în Termeni acum |

## 3. Cont și autentificare

| ID | Test |
|---|---|
| ACC-01 🔴 | Verificare email obligatorie la înregistrare — altfel planul Free e infinit (vezi CST-04) |
| ACC-02 | Resetare parolă: token expiră, se folosește o singură dată |
| ACC-03 | Login social (dacă există) cu același email ca un cont pe parolă — nu creează cont dublu |
| ACC-04 | Ștergerea contului: ce se întâmplă cu cursurile, certificatele și linkurile publice |
| ACC-05 | Export de date la cerere (GDPR) |
| ACC-06 | Rate limit pe login și pe înregistrare |

## 4. Dashboardul de admin

| ID | Test |
|---|---|
| ADM-01 🔴 | Un utilizator obișnuit accesează ruta de admin — refuzat pe server, nu doar ascuns |
| ADM-02 | Cifrele de venit din admin = cifrele din Stripe |
| ADM-03 | Numărul de utilizatori activi e calculat corect (activ = ce, mai exact?) |
| ADM-04 | Admin poate vedea conținutul cursurilor utilizatorilor? Dacă da, scrie-o în politica de confidențialitate |
