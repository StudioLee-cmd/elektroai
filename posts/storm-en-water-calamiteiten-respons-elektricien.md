---
title: "Storm en water: calamiteiten-respons elektricien"
slug: storm-en-water-calamiteiten-respons-elektricien
date: "2026-05-15"
excerpt: "Calamiteiten-respons-protocol voor elektriciens na storm of waterschade: veiligheid, schade-rapport voor verzekeraar, snel-herstel en weeralarm-trigger."
image: "/images/blog/storm-en-water-calamiteiten-respons-elektricien.jpg"
authorSlug: "tim-van-der-lee"
tags: ["Lead-opvolging", "Calamiteiten", "Storm", "Waterschade", "Elektricien"]
cluster: "automatisering"
---

**In het kort:**
- Bij een storm- of waterschade-evenement (bliksem, overstroming, lekkage) belt een klant binnen het uur 3-8 elektriciens. De eerste die binnen 30 minuten een telefoon-veiligheidscheck doet en binnen 4 uur ter plaatse is, wint de klus EN typically alle vervolg-installatie-werk (vaak €3.000-€12.000 totaal-werk).
- De respons heeft drie fasen: 1) directe veiligheidscheck via telefoon (uitschakel-instructie groepenkast, geen contact met natte installatie), 2) ter-plaatse schade-rapport voor verzekeraar (foto's, NEN 3140 controle, hersteloffer), 3) snel-herstel met verzekeraar-rechtstreekse facturatie.
- Een AI-trigger gekoppeld aan KNMI weeralarm (geel/oranje/rood code stormwaarschuwing) activeert automatisch een verhoogde bereikbaarheid: extra collega op stand-by, vooraf-bevoorrade calamiteit-kit in de bus, prioriteit-instelling op de telefoon-flow. Elektriciens die dit vóór 2026 hebben ingericht, halen 35-50% meer storm-klussen dan concurrentie die ad-hoc reageert.
- Een [chatbot voor elektriciens](/chatbot) die 24/7 storm-meldingen aanneemt en triage doet (veiligheid eerst, dan inplannen) verlaagt mis-belde leads van 40-50% naar 10-15%. Een [crm voor elektriciens](/crm) met aparte calamiteit-pipeline maakt dat een storm 5-15 nieuwe vaste klanten oplevert in plaats van eenmalige spoed-klussen.

## Het probleem: storm-respons is meestal ad-hoc en chaotisch

In de gemiddelde elektricien-praktijk is calamiteit-respons ongestructureerd. Wat er gebeurt bij een stormnacht:

- 22:00: bliksem slaat in, woning krijgt schade, kortsluiting in 1-2 groepen
- 22:15: bewoner belt zijn vaste elektricien, krijgt voicemail of "morgen pas"
- 22:30: bewoner belt 4-6 andere elektriciens uit Google, eerste die opneemt wint
- 22:45: gegunde elektricien komt langs zonder vooraf-instructies, voert ad-hoc herstel uit
- 02:00: probleem grotendeels opgelost maar 30-40% van de schade niet correct in kaart
- Volgende dag: bewoner krijgt factuur van €450-€800, gaat declareren bij verzekeraar, vergoeding maandenlang in discussie

Het ontbreekt aan: vooraf-protocol, schade-rapport, verzekeraar-rechtstreekse facturatie, vervolg-werk.

Voor de elektricien betekent dit: 1 storm = 3-8 spoed-uitrukken van €450 elk = €1.350-€3.600. Maar geen sticky-klanten, geen vervolgwerk, geen verzekeraar-rechtstreekse facturatie.

Met een gestructureerd protocol verandert dit naar: 1 storm = 8-15 vaste klanten + €6.000-€18.000 totaal-omzet inclusief vervolgwerk.

## Het 3-fase calamiteiten-protocol

### Fase 1: directe veiligheidscheck via telefoon (binnen 5 minuten)

Klant belt over storm- of waterschade. EERSTE actie is een telefoon-veiligheidscheck, niet een afspraak inplannen.

Script in 5 vragen:
1. "Is iedereen in het pand veilig en buiten de gevaren-zone?"
2. "Is er nog stroom op delen van het pand?"
3. "Heeft u of iemand anders contact gehad met een natte installatie of een gevaarlijke kabel?"
4. "Kunt u zelf bij de groepenkast komen, of is die water- of brandgeschade?"
5. "Zo ja, kunt u de hoofdschakelaar omleggen naar UIT?"

Bij groen licht (iedereen veilig, hoofdschakelaar UIT): "Wij sturen iemand binnen 3 uur. Geen contact maken met natte delen, lampen of stopcontacten tot wij er zijn."

Bij rood licht (verwonding, brand, gevaar): "BEL DIRECT 112 voor brandweer of ambulance. Wij komen daarna voor de installatie. Volg verder de instructies van de hulpverleners."

Deze 5-minuten-check is wat de klant onthoudt: "die elektricien wist precies wat ik moest doen, voelde meteen veilig". Mond-tot-mondreclame begint hier.

### Fase 2: ter-plaatse schade-rapport (binnen 24 uur)

Binnen 3-4 uur na de melding: ter plaatse voor diagnose. Niet voor onmiddellijk herstel. Eerste prioriteit: complete schade-mapping voor de verzekeraar.

Wat je doet:
- Visueel inspectie en fotorapport (alle beschadigde apparatuur, kabels, groepenkast, stopcontacten)
- NEN 3140 controle van de gehele installatie (welke groepen zijn geraakt)
- Lijst van benodigde vervanging (materiaal-specifiek)
- Hersteloffer per groep / per onderdeel
- Schriftelijke verklaring "schade is veroorzaakt door [storm/water] op datum [X]"

Voor de meeste verzekeringen (Centraal Beheer, Aon, Achmea, NN) is dit rapport voldoende voor uitkering zonder eigen taxateur. Voor de klant betekent dat: van 4-6 weken wachttijd naar 5-10 werkdagen.

### Fase 3: snel-herstel + verzekeraar-rechtstreeks (binnen 5-10 werkdagen)

Met uitkering-toezegging van de verzekeraar:
- Klant geeft schriftelijk akkoord op het hersteloffer
- Jij bestelt onderdelen (groepenkast, automaten, stopcontacten, kabel)
- Werk wordt ingepland binnen 5-10 werkdagen
- Factuur gaat RECHTSTREEKS naar de verzekeraar (na akkoord, vooraf bevestigd)
- Klant betaalt eigen risico (typically €100-€250), de rest gaat via verzekering

De klant doet niets behalve toestemming geven. Geen voorschieten, geen claims uitwerken, geen administratie.

![Elektricien met meter en gereedschap bij waterschade-groepenkast voor verzekering-inspectie](/images/blog/storm-en-water-calamiteiten-respons-elektricien-2.jpg)

## De KNMI-weeralarm trigger

Sinds 2024 publiceert KNMI per provincie weeralarmen (code geel, oranje, rood) voor storm, hagel en extreme regen. Deze waarschuwingen komen typically 24-72 uur voor het evenement.

Een gestructureerde elektricien-praktijk activeert bij elke code geel of hoger:

**Code geel (mogelijke schade):**
- Telefoon-flow ingesteld op "verhoogde paraatheid"
- Calamiteit-kit in 1 vaste bus vooraf bevoorraad (groepenkast standaard, automaten 16A en 25A, kabel, isolatieband, meter)
- Bereikbaarheids-rooster verschoven (1 extra collega beschikbaar)

**Code oranje (waarschijnlijke schade):**
- 24/7 telefoon-bereikbaarheid via [voice ai voor elektriciens](/voice-ai) voor de eerste triage
- 2-3 collega's op stand-by
- WhatsApp-broadcast naar bestaande klanten in de geel-gemarkeerde gebieden: "Verwacht storm. Bij schade direct WhatsApp ons, wij prioriteren."

**Code rood (zware schade):**
- Alle non-spoed afspraken verzet
- Externe samenwerkings-elektriciens geactiveerd (mantelovereenkomst)
- 12-uur shift-rooster voor alle medewerkers

Een [crm voor elektriciens](/crm) met integratie met KNMI weeralarm-API automatiseert dit protocol, bij geel-alarm wordt het rooster automatisch aangepast.

## Hoe je administratie inricht

Vier elementen voor structuurele calamiteit-respons:

**1. Calamiteit-pipeline in CRM.** Aparte status-flow: "Telefoon-triage → Ter-plaatse-inspectie → Verzekeraar-rapport ingediend → Akkoord verzekeraar → Herstel ingepland → Uitgevoerd → Gefactureerd". Per klant zichtbaar waar het zit.

**2. Standaard schade-rapport-template.** Word/Google Docs template met vaste secties (klant-info, schade-foto-bijlage, NEN-controle-uitkomst, hersteloffer per groep, schade-verklaring). Tijd per rapport: 20-30 minuten in plaats van 90+.

**3. Verzekeraar-contactlijst.** Per verzekeraar (Centraal Beheer, NN, Aon, Achmea, Univé): direct telefoonnummer schade-afdeling, e-mail voor rapportage, gemiddelde verwerkingstijd, of jouw rapport zonder eigen taxatie wordt geaccepteerd.

**4. Factureer-rechtstreeks-akkoord.** Voor elk verzekeraar: een eenmalig akkoord voor jouw bedrijf als "voorkeurs-installateur" zodat factuur direct naar verzekeraar gaat. Bespaart 4-8 weken cash-flow per klus.

## Wat NIET helpt: typische fouten

**Fout 1: Direct repareren zonder schade-rapport.** Klant krijgt factuur. Verzekeraar wijst af "geen documentatie, geen vergoeding". Klant betaalt zelf, ontevreden, geen vervolgwerk.

**Fout 2: Telefoon-bereikbaarheid afhankelijk van 1 persoon.** Bij grote storm zijn er 8-15 binnenkomende oproepen tegelijk. Eén persoon kan maximaal 6 in 30 min beantwoorden. Andere 6 bellen direct concurrent. Een [voice ai voor elektriciens](/voice-ai) lost dit op.

**Fout 3: Spoed-uitruk-prijs niet vooraf communiceren.** Klant denkt "elektricien komt langs, dat zal normale prijs zijn". Factuur van €450 voor 22:00-uitruk leidt tot discussie. Vooraf in het telefoon-script: "Onze spoed-uitruk-tarief is €X vast plus €Y per uur, akkoord?"

## Wat StudioLee voor je inricht

Bij ElektroAI helpen we elektriciens hun calamiteiten-respons professioneel inrichten zonder zelf 24/7 telefoon te zijn. Concreet wat we inrichten:

- Een 5-vragen telefoon-triage-script voor je [voice ai voor elektriciens](/voice-ai) en 24/7 bereikbaarheid
- Een [chatbot voor elektriciens](/chatbot) op je website voor storm-meldingen met automatische prioriteit-vlag
- Een [crm voor elektriciens](/crm) met aparte calamiteit-pipeline en KNMI-weeralarm-integratie
- Standaard schade-rapport-template (Word + Google Docs) voor 3 hoofd-schade-types (storm, water, brand)
- Verzekeraar-contactlijst met direct doorkiesnummers schade-afdelingen (top-8 NL verzekeraars)
- Factureer-rechtstreeks-akkoord-template voor elke verzekeraar
- Calamiteit-kit-checklist (welke onderdelen vooraf-bevoorraden in welke bus)
- Een Groei-of-Geld-Terug Garantie op het complete pakket

[Plan een gratis AI-scan voor elektriciens](/gratis-scan) of bekijk onze [tarieven ElektroAI](/tarieven). Vragen? [Plan een gesprek met Tim](https://calendly.com/tim-studiolee).

<div class="container"><div class="row justify-content-center"><div class="col-lg-10 col-xl-8 mx-auto"><p class="lees-ook my-5 px-4 py-3 rounded-3 fs-6 text-dark" style="background-color: rgba(193, 255, 114, 0.18);"><strong class="text-dark">Lees ook:</strong> <a href="/blog/gemiste-oproep-elektricien-klanten-verliezen" class="text-dark fw-semibold">Gemiste oproep als elektricien: je duurste fout</a> →</p></div></div></div>
