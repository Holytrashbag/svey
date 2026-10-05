<script setup lang="ts">
import LegalPage from "@/components/legal/LegalPage.vue";
import { legalContact } from "@/lib/legal-contact";
</script>

<template>
  <LegalPage title="Impressum" updated="10. Juni 2026">
    <p>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).</p>

    <h2>Diensteanbieter</h2>
    <address>
      {{ legalContact.name }}<br />
      {{ legalContact.street }}<br />
      {{ legalContact.city }}<br />
      Deutschland
    </address>

    <h2>Kontakt</h2>
    <p>
      E-Mail: <a :href="`mailto:${legalContact.email}`">{{ legalContact.email }}</a><br />
      Telefon: {{ legalContact.phone }}
    </p>

    <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
    <address>
      {{ legalContact.name }}<br />
      {{ legalContact.street }}<br />
      {{ legalContact.city }}<br />
      Deutschland
    </address>

    <h2>Haftung für Inhalte</h2>
    <p>
      Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach
      den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter
      jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
      oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
      allgemeinen Gesetzen bleiben hiervon unberührt.
    </p>

    <h2>Haftung für Links</h2>
    <p>
      Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
      Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für
      die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
      verantwortlich.
    </p>

    <h2>Urheberrecht</h2>
    <p>
      Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
      deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet.
    </p>

    <h2>Hinweis zu Magic: The Gathering</h2>
    <p>
      Svey ist ein inoffizielles, von Fans erstelltes Werkzeug und steht in keiner Verbindung
      zu Wizards of the Coast LLC und wird von dieser nicht unterstützt oder gesponsert. Magic: The
      Gathering sowie alle zugehörigen Karten-, Marken- und Bildrechte sind Eigentum von Wizards of
      the Coast. Kartendaten stammen von Drittanbietern (u. a. Scryfall, Archidekt).
    </p>
  </LegalPage>
</template>
