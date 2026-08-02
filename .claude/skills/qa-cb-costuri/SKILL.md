---
name: qa-cb-costuri
description: Măsoară economia reală a Coursbit — costul per curs generat pe fiecare model (Gemini, GPT-4o, Claude), costul audio TTS, imaginile, chatbotul, și testează abuzul: generare în buclă, conturi Free multiple, promptul care umflă costul. Folosește-l ÎNAINTE de restul testelor și ori de câte ori se discută preț, planuri, limite, marjă sau „unlimited".
---

# QA — Costuri și abuz (se rulează primul)

Oferta spune „Unlimited courses" la 12$/lună. Un curs cu 12 module și 48 de lecții nu e ieftin. Trebuie să știi cifra exactă înainte de a vinde abonamente, nu după.

## 1. Măsurarea costului real

Generează **10 cursuri identice ca dimensiune** pe fiecare model și notează din dashboardul furnizorului:

| Ce măsori | Gemini | GPT-4o | Claude |
|---|---|---|---|
| Tokeni intrare / curs | | | |
| Tokeni ieșire / curs | | | |
| Cost / curs | | | |
| Timp de generare | | | |
| Rată de eșec | | | |

Adaugă separat:
- **Imagini** — câte per curs, cost per imagine, cine le generează
- **Audio (TTS)** — un curs de 48 de lecții citit cu voce e cel mai scump lucru din platformă. Măsoară costul unui curs complet convertit în audio.
- **Chatbot** — mesaje medii per curs, cost per mesaj, cu ce context (dacă trimiți tot cursul la fiecare întrebare, costul explodează)
- **Quiz și regenerări** — utilizatorii regenerează mult până le place

**Rezultatul obligatoriu:** costul mediu al unui client Pro care folosește platforma intens, pe lună. Dacă e peste 12$, planul Pro pierde bani.

## 2. Testele de abuz (aici se rupe „unlimited")

| ID | Test | Așteptat |
|---|---|---|
| CST-01 🔴 | Cont Pro generează 200 de cursuri într-o zi, prin API, în buclă | Există limită de ritm. Fără ea, un singur utilizator îți poate face o factură de mii de dolari peste noapte |
| CST-02 🔴 | Cont Free generează 11 cursuri | Al 11-lea e blocat, inclusiv prin apel direct la API, nu doar în interfață |
| CST-03 🔴 | Cont Free șterge cursuri ca să „elibereze locuri" | Decide regula: 10 cursuri simultan sau 10 în total? Testeaz-o. Dacă ștergerea resetează contorul, planul Free e nelimitat de fapt |
| CST-04 | 20 de conturi Free create cu emailuri temporare | Verificare de email obligatorie; altfel planul Free e infinit |
| CST-05 | Curs cu 20 de topicuri × text foarte lung în prompt | Există plafon pe dimensiunea generării |
| CST-06 | Utilizator lipește 50.000 de cuvinte în câmpul de subiect | Limitat înainte de a ajunge la model |
| CST-07 | Audio generat de 50 de ori pentru același curs | Se refolosește fișierul, nu se regenerează |
| CST-08 | Chatbot: 500 de mesaje într-o oră | Limită per utilizator |
| CST-09 | Generare abandonată la jumătate (închide tabul) | Se oprește apelul AI sau plătești pentru un curs pe care nimeni nu-l vede? |
| CST-10 🔴 | Alertă de buget la furnizor | Ai setat limită dură pe cont? Dacă nu, un bug în buclă îți poate goli cardul într-o noapte |

## 3. Ce trebuie să existe înainte de lansare

- [ ] Limită de ritm per utilizator (ex. X cursuri pe oră), nu doar per plan
- [ ] Plafon lunar pe cost per utilizator, cu avertisment la 80%
- [ ] Limită dură de buget la fiecare furnizor AI
- [ ] Alertă pe email/telefon când costul zilnic depășește pragul
- [ ] Cache pentru audio, imagini și cursuri regenerate identic
- [ ] Contorizare per utilizator, vizibilă în admin: câte cursuri, câte imagini, câte minute audio, cât a costat

## 4. Recomandare de model de preț

„Unlimited" e cel mai periculos cuvânt de pe pagina ta, pentru că 2% dintre utilizatori consumă cât 90% din restul. Variante mai sigure, în ordinea siguranței:

1. Credite: X generări incluse, restul la bucată — cel mai transparent
2. „Unlimited" cu politică de utilizare corectă (fair use) scrisă în Termeni, cu prag concret
3. Audio și video ca extra plătit — sunt cele mai scumpe funcții

Oricare ai alege, scrie limita în Termeni ÎNAINTE de primul client. Retragerea unui „unlimited" după ce ai vândut abonamente supără mult mai tare decât o limită anunțată de la început.
