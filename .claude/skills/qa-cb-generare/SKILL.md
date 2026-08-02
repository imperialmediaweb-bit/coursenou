---
name: qa-cb-generare
description: Testează generarea de cursuri cu AI în Coursbit — structura cursului, calitatea și corectitudinea conținutului, cele 23 de limbi, comutarea între Gemini/GPT-4o/Claude, quiz-urile, imaginile, linkurile video și ce se întâmplă când modelul cade sau halucinează. Folosește-l ori de câte ori se testează generarea, calitatea cursurilor, limbile sau modelele AI.
---

# QA — Generarea cursurilor

Testul nu e „a generat un curs". E „ce iese ar fi acceptabil pentru un profesor universitar care își pune numele pe el".

## 1. Structura și fiabilitatea

| ID | Test | Așteptat |
|---|---|---|
| GEN-01 @smoke | Curs simplu, subiect comun | Structură completă: module, lecții, quiz. Fără secțiuni goale |
| GEN-02 🔴 | Aceeași generare de 20 de ori | Reușește 20/20. Notează rata reală de eșec — dacă e 1 din 20, un utilizator din 20 pleacă |
| GEN-03 🔴 | Generare întreruptă (net căzut, tab închis) | Cursul parțial se salvează sau se anulează curat; NU rămâne blocat la 78% pe veci |
| GEN-04 | Generare cu 20 de topicuri (maximul Pro) | Termină, nu dă timeout |
| GEN-05 | Subiect de un cuvânt: „Chimie" | Cere lămuriri sau generează ceva coerent, nu 3 lecții goale |
| GEN-06 | Subiect fără sens: „asdkjh qwe" | Mesaj clar, NU generează un curs inventat pe nimic |
| GEN-07 | Progresul afișat (78% etc.) | Reflectă realitatea; nu sare de la 10% la 100% |
| GEN-08 | Două generări simultane, același cont | Ambele merg sau a doua e pusă la coadă cu mesaj clar |
| GEN-09 🔴 | Furnizorul AI dă eroare / cotă depășită | Mesaj clar, utilizatorul NU pierde creditul/cursul, se poate reîncerca |
| GEN-10 | Comutare Gemini → GPT-4o → Claude din setări | Se aplică imediat; cursul spune cu ce model a fost generat |

## 2. Calitatea conținutului — partea care decide dacă produsul se vinde

Ia 5 subiecte și evaluează la mână fiecare curs generat:

| ID | Verificare | Cum |
|---|---|---|
| GEN-20 🔴 | Corectitudine factuală | Alege un subiect pe care îl știi bine. Numără afirmațiile greșite. Peste 2 greșeli la un curs = risc de reputație pentru clientul tău, care își pune numele pe material |
| GEN-21 | Repetiție între lecții | Lecția 4 nu repetă lecția 2 cu alte cuvinte |
| GEN-22 | Progresie logică | Nu explică rețele neuronale înainte de a defini ce e învățarea supravegheată |
| GEN-23 🔴 | Quiz: răspunsul corect e chiar corect | Verifică 20 de întrebări. Un quiz cu răspuns greșit e mai rău decât lipsa quiz-ului |
| GEN-24 | Quiz: variantele greșite sunt plauzibile | Nu „A) corect B) banana C) nu știu" |
| GEN-25 | Explicațiile la răspunsuri | Există și sunt coerente cu răspunsul corect |
| GEN-26 🔴 | Linkuri video | Chiar funcționează? Modelele inventează frecvent ID-uri de YouTube. Verifică automat fiecare link (cod 200 + video existent) |
| GEN-27 | Imagini | Relevante pentru lecție, nu decorative aleatoriu. Dacă sunt generate, verifică drepturile |
| GEN-28 | Surse și citate | Dacă cursul citează studii sau cărți, verifică 5 — halucinarea de bibliografie e clasică |
| GEN-29 | Subiect sensibil (medical, juridic, financiar) | Există avertisment? Un curs generat despre dozaje de medicamente e o problemă serioasă |
| GEN-30 | Subiect interzis (armament, conținut ilegal) | Refuzat, cu mesaj |

## 3. Cele 23 de limbi

Nu te uita doar la engleză. Testează cel puțin 6 limbi, alese ca să acopere cazurile grele:

| ID | Limbă | De ce |
|---|---|---|
| GEN-40 🔴 | Română | Diacriticele în interfață, PDF, PPT, quiz, certificat. Verifică ș și ț (nu sub-virgulă greșită) |
| GEN-41 | Arabă sau ebraică | Scriere de la dreapta la stânga — se rupe aproape sigur în PDF și PPT |
| GEN-42 | Chineză sau japoneză | Fonturile lipsesc frecvent la export → pătrățele goale |
| GEN-43 | Germană | Cuvinte lungi care sparg butoanele și titlurile |
| GEN-44 | Greacă sau rusă | Alfabet diferit |
| GEN-45 | O limbă mai rară din cele 23 | Calitatea scade mult? Dacă un curs în limba X e slab, mai bine scoți limba decât să vinzi ceva prost |
| GEN-46 | Amestec: subiect scris în română, limbă aleasă engleză | Cursul iese în limba aleasă, consecvent, nu jumătate-jumătate |
| GEN-47 | Interfața (butoane, quiz, certificat) în limba cursului | Sau măcar consecvent, nu titlu în greacă și butoane în engleză |

## 4. Ce raportezi

Un tabel cu: model × limbă × rată de reușită × greșeli factuale la 100 de afirmații × cost × timp. Ăsta e documentul care îți spune ce model pui pe implicit și ce limbi poți promova pe pagina de prezentare fără să te faci de râs.
