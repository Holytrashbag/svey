<script setup lang="ts">
import LegalPage from "@/components/legal/LegalPage.vue";
import { legalContact } from "@/lib/legal-contact";
</script>

<template>
  <LegalPage title="Datenschutz" updated="8. Oktober 2026">
    <p>
      Diese Datenschutzerklärung informiert über Art, Umfang und Zweck der Verarbeitung
      personenbezogener Daten innerhalb von Svey (im Folgenden „die App") nach der
      Datenschutz-Grundverordnung (DSGVO).
    </p>

    <h2>1. Verantwortlicher</h2>
    <address>
      {{ legalContact.name }}<br />
      {{ legalContact.street }}<br />
      {{ legalContact.city }}<br />
      Deutschland<br />
      E-Mail: <a :href="`mailto:${legalContact.email}`">{{ legalContact.email }}</a>
    </address>

    <h2>2. Welche Daten wir verarbeiten</h2>

    <h3>Konto- und Profildaten</h3>
    <p>
      Bei der Registrierung und Nutzung verarbeiten wir deinen Anzeigenamen, deine E-Mail-Adresse,
      ein optionales Profilbild (Avatar) sowie – bei Registrierung per E-Mail – ein verschlüsselt
      gespeichertes Passwort. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
      (Vertrag/Nutzungsverhältnis).
    </p>

    <h3>Anmeldung über Discord oder Google (OAuth)</h3>
    <p>
      Meldest du dich über Discord oder Google an, erhalten wir von dort deine Kennung, deinen
      Namen, deine E-Mail-Adresse und ggf. dein Profilbild sowie technische Zugriffstoken. Dabei
      werden Daten an Discord bzw. Google übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
      sowie deine Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO beim Auslösen der Anmeldung.
    </p>

    <h3>Server- und Sitzungsdaten</h3>
    <p>
      Zur Absicherung deiner Anmeldung speichern wir je Sitzung deine IP-Adresse und die
      Browserkennung (User-Agent). Beim Aufruf der App fallen zudem serverseitige Zugriffsdaten (u.
      a. IP-Adresse, Zeitpunkt, abgerufene Ressource) an. Rechtsgrundlage: Art. 6 Abs. 1 lit. f
      DSGVO (berechtigtes Interesse an Sicherheit und stabilem Betrieb).
    </p>

    <h3>Spiel-, Deck- und Playgroup-Daten</h3>
    <p>
      Wir verarbeiten die von dir erstellten Inhalte: Playgroups und deren Mitglieder, Decks (inkl.
      über Archidekt importierter Kartenlisten), gespielte Partien, Statistiken und Antworten aus
      Umfragen nach dem Spiel (inkl. Freitext). Trägst du Gäste oder vorab eingeladene Mitglieder
      ein, verarbeiten wir den dabei angegebenen Anzeigenamen dieser Personen. Rechtsgrundlage: Art.
      6 Abs. 1 lit. b und lit. f DSGVO.
    </p>
    <p>
      Freitext-Notizen aus der Umfrage nach dem Spiel sind für alle Mitglieder der Playgroup
      sichtbar, in der die Partie gespielt wurde, und erscheinen im Spielrückblick beim Namen der
      Person, für deren Platz sie erfasst wurden (bei Gästen beim eingetragenen Gastnamen). Dasselbe
      gilt für Notizen zu vorzeitig beendeten Partien. Löschst du dein Konto, werden deine
      Umfrage-Antworten samt Notizen gelöscht; Notizen zu vorzeitig beendeten Partien gehören zur
      Partie und bleiben für die Playgroup erhalten, solange die Partie besteht.
    </p>

    <h2>3. Cookies</h2>
    <p>
      Wir setzen ausschließlich technisch notwendige Cookies ein, um deine Anmeldung (Sitzung)
      aufrechtzuerhalten. Diese sind für den Betrieb erforderlich und nach § 25 Abs. 2 Nr. 2 TDDDG
      nicht einwilligungspflichtig. Tracking- oder Analyse-Cookies setzen wir nicht.
    </p>

    <h2>4. Empfänger und Auftragsverarbeiter</h2>
    <p>Zur Bereitstellung der App geben wir Daten an folgende Dienstleister weiter:</p>
    <ul>
      <li>
        <strong>Hosting:</strong> Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen,
        Deutschland – Betrieb von Server und Datenbank in einem Rechenzentrum in Falkenstein
        (Deutschland). Es besteht ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.
      </li>
      <li>
        <strong>E-Mail-Versand:</strong> Brevo (Sendinblue SAS, 106 boulevard Haussmann, 75008
        Paris, Frankreich) – Versand von System-E-Mails wie der Bestätigung deiner E-Mail-Adresse
        und dem Zurücksetzen deines Passworts. Dabei werden deine E-Mail-Adresse und dein
        Anzeigename verarbeitet. Die Verarbeitung erfolgt innerhalb der EU. Es besteht ein
        Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.
      </li>
      <li>
        <strong>Discord, Google:</strong> Authentifizierung (OAuth-Login), sofern du dies nutzt.
      </li>
      <li>
        <strong>Scryfall:</strong> Kartenbilder (z. B. Commander-Artwork) werden nicht direkt von
        deinem Browser geladen, sondern über unseren Server: Dieser ruft die Bilder bei Scryfall
        (Scryfall LLC, USA) ab, speichert sie zwischen (Cache) und liefert sie von unserem Server in
        Deutschland aus. Eine direkte Verbindung von deinem Browser zu Scryfall – und damit eine
        Übertragung deiner IP-Adresse an Scryfall – findet nicht statt. An Scryfall wird dabei nur der
        Kartenname bzw. die Karten-ID übermittelt, kein Personenbezug.
      </li>
      <li>
        <strong>Archidekt:</strong> Beim Import oder der Synchronisierung eines Decks ruft unser
        Server die öffentlich zugänglichen Deck- und Kartendaten von Archidekt ab. Dieser Abruf
        erfolgt serverseitig; es besteht dabei keine direkte Verbindung von deinem Browser zu
        Archidekt.
      </li>
    </ul>

    <h2>5. Übermittlung in Drittländer</h2>
    <p>
      Bei einigen der genannten Dienste werden personenbezogene Daten – insbesondere die IP-Adresse –
      in die USA übermittelt. Die Rechtsgrundlage unterscheidet sich je Anbieter:
    </p>
    <ul>
      <li>
        <strong>Discord (Discord, Inc.):</strong> Discord ist unter dem EU-US Data Privacy Framework
        (DPF) zertifiziert. Die Übermittlung stützt sich auf den Angemessenheitsbeschluss der
        EU-Kommission nach Art. 45 DSGVO.
      </li>
      <li>
        <strong>Google (Google LLC):</strong> Google LLC ist unter dem EU-US Data Privacy Framework
        (DPF) zertifiziert. Die Übermittlung stützt sich auf den Angemessenheitsbeschluss der
        EU-Kommission nach Art. 45 DSGVO; ergänzend bietet Google EU-Standardvertragsklauseln an.
      </li>
    </ul>
    <p>
      Kartenbilder werden serverseitig über Scryfall bezogen und von unserem Server in Deutschland
      ausgeliefert (siehe Ziffer 4); dabei werden keine personenbezogenen Daten an Scryfall in die USA
      übermittelt.
    </p>

    <h2>6. Speicherdauer</h2>
    <p>
      Wir speichern personenbezogene Daten, solange dein Konto besteht bzw. solange es für die
      genannten Zwecke erforderlich ist. Anmeldesitzungen (samt gespeicherter IP-Adresse und
      Browserkennung) laufen spätestens 7 Tage nach der letzten Aktivität ab. Technische
      Server-Logs werden spätestens nach 14 Tagen automatisch gelöscht; routinemäßige Zugriffslogs
      werden zudem ohne IP-Adresse gespeichert. Nach Löschung deines Kontos werden deine
      personenbezogenen Daten gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten
      entgegenstehen.
    </p>

    <h2>7. Deine Rechte</h2>
    <p>Dir stehen nach der DSGVO folgende Rechte zu:</p>
    <ul>
      <li>Auskunft über die zu dir gespeicherten Daten (Art. 15)</li>
      <li>Berichtigung unrichtiger Daten (Art. 16)</li>
      <li>Löschung (Art. 17)</li>
      <li>Einschränkung der Verarbeitung (Art. 18)</li>
      <li>Datenübertragbarkeit (Art. 20)</li>
      <li>Widerspruch gegen Verarbeitungen auf Basis berechtigter Interessen (Art. 21)</li>
      <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3)</li>
    </ul>
    <p>
      Zur Ausübung deiner Rechte genügt eine Nachricht an
      <a :href="`mailto:${legalContact.email}`">{{ legalContact.email }}</a>.
    </p>

    <h2>8. Beschwerderecht</h2>
    <p>
      Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO),
      insbesondere in dem Mitgliedstaat deines Aufenthaltsorts. Die für uns zuständige
      Aufsichtsbehörde ist:
    </p>
    <address>
      Berliner Beauftragte für Datenschutz und Informationsfreiheit<br />
      Alt-Moabit 59–61<br />
      10555 Berlin<br />
      Telefon: +49 30 13889-0<br />
      E-Mail: <a href="mailto:mailbox@datenschutz-berlin.de">mailbox@datenschutz-berlin.de</a><br />
      <a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener"
        >www.datenschutz-berlin.de</a
      >
    </address>

    <h2>9. Minderjährige</h2>
    <p>
      Die App richtet sich nicht an Kinder unter 16 Jahren. Erfolgt eine Verarbeitung auf Grundlage
      einer Einwilligung, ist diese bei Minderjährigen nur mit Zustimmung der Erziehungsberechtigten
      wirksam (Art. 8 DSGVO).
    </p>
  </LegalPage>
</template>
