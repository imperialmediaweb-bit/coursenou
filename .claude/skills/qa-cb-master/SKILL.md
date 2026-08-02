---
name: qa-cb-master
description: Orchestrator de testare pentru Coursbit — platforma de generare de cursuri cu AI (Gemini/GPT-4o/Claude, quiz-uri, certificate, export PDF/PPT, audio, chatbot, 23 de limbi, planuri Free/Pro). Folosește-l ori de câte ori se cere „testează Coursbit", „e gata de producție?", „verifică platforma de cursuri", QA complet sau testare înainte de lansare ori de vânzare pe Flippa.
---

# QA Master — Coursbit

Diferența față de o platformă obișnuită: aici **produsul e output-ul unui model AI**. Nu testezi doar dacă butoanele merg — testezi dacă ce iese e bun, cât costă și ce se întâmplă când modelul spune prostii.

## Setup

`qa/config.json`: url, cont Free de test, cont Pro de test, cont admin, acces la dashboardul de costuri al furnizorilor AI (Gemini/OpenAI/Anthropic).

**Regulă:** contul Pro de test trebuie să fie un abonament real, plătit cu cardul de test Stripe, nu un flag pus manual în baza de date. Altfel nu testezi ce trăiește clientul.

## Ordinea rulării

1. **qa-cb-costuri** 🔴 — primul, pentru că „Unlimited courses" la 12$/lună poate fi o gaură prin care pierzi bani cu fiecare client. Dacă economia nu ține, restul nu contează.
2. **qa-cb-securitate** — linkuri publice de curs, izolare între conturi, prompt injection, dashboard admin.
3. **qa-cb-plati** — Free vs Pro, limitele de plan, abonament, anulare, downgrade.
4. **qa-cb-generare** — calitatea cursului, cele 23 de limbi, comutarea între modele.
5. **qa-cb-export** — PDF, PPT, audio, certificate, chatbot.

## Bucla până la 0 erori

Ca la orice campanie: repari blocantele, re-rulezi suita afectată + testele `@smoke`, la a treia iterație re-rulezi tot. Nu declari gata până nu ai 3 rulări verzi consecutive.

## Criterii de ieșire

- [ ] 0 blocante: pierdere de curs generat, acces la cursurile altui utilizator, plată încasată fără acces, limită de plan care nu se aplică
- [ ] Generarea unui curs complet reușește de 20 din 20 de ori, în 3 limbi diferite, pe fiecare model
- [ ] Costul real per curs generat e măsurat și scris în raport, comparat cu prețul abonamentului
- [ ] Ce se întâmplă când furnizorul AI cade e testat, nu presupus
- [ ] Exportul PDF și PPT se deschide corect în Word/PowerPoint/Google Slides, cu diacritice
- [ ] Un utilizator Free nu poate depăși cele 10 cursuri, nici prin API direct

## Ce raportezi

Prima frază: dacă economia unitară ține sau nu. La un produs cu „unlimited" în ofertă, ăsta e riscul numărul unu, înaintea oricărui bug.
