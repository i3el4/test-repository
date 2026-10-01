# SWITCHtube Serienbrief

Browser-Seite für die drei Erinnerungen zur Löschung ungenutzter SWITCHtube-Videos. Frank öffnet sie per Doppelklick, ohne Terminal und ohne Python.

## So starten

1. Ordner `serienbrief` öffnen.
2. `index.html` doppelklicken (Chrome oder Edge).
3. Oben die Runde wählen: zuerst **Test**, später Erinnerung 1, 2 und 3.

Die Seite merkt sich Texte, Auslassungen und den Versandstatus in diesem Browser.

## Test

Die Runde **Test** schreibt nur die fünf Projektadressen an, mit dem vereinbarten Text und einem Beispielvideo. Dieselben Inhalte gehen an alle fünf, nicht die persönlichen Listen.

- **Diese Vorschau speichern** legt eine E-Mail-Datei (`.eml`) in den Download-Ordner.
- Auf dem Mac: Rechtsklick auf die Datei, **Öffnen mit**, **Microsoft Outlook**, dann **Senden**. Ein normaler Doppelklick öffnet sie manchmal in der App Mail.
- **Alle als ZIP speichern** packt alle Adressen der gewählten Runde.

## Echte Runden

Erinnerung 1, 2 und 3 personalisieren den Brief: Videotitel, Link, letzter Aufruf, Kanal und Rolle. Video- und Kanaladresse erhalten das Video je einmal; ist es dieselbe Adresse, nur ein Eintrag.

Die Texte sind Entwürfe und lassen sich vor dem Versand ändern. Die Handlungsaufforderung und eine optionale Rückmeldefrist stehen unter der Videoliste.

In der Liste sind auch Studierende enthalten, weil ihre Adressen in den Spalten der Excel-Datei stehen. Über die Schalter lässt sich der Versand auf Mitarbeitende begrenzen.

## Viele Mails auf dem Mac mit Outlook

**Outlook auf dem Mac** speichert ein Paket. Nach dem Entpacken `Mails senden.command` doppelklicken.

- Outlook muss geöffnet und mit `frank.sippach@fhnw.ch` angemeldet sein.
- Falls der Schalter **Neues Outlook** aktiv ist, auf **Legacy Outlook** umschalten. Nur das klassische Outlook nimmt die Mails aus diesem Paket entgegen.
- Die automatische Signatur vorher kurz ausschalten, sonst steht sie zusätzlich unter der Grussformel.
- Beim ersten Start fragt macOS, ob das Terminal Outlook steuern darf. **OK** wählen.
- Wenn macOS die Datei blockiert: Rechtsklick, **Öffnen**, und im Dialog noch einmal **Öffnen**.
- **Nur Entwürfe** legt die Mails im Ordner Entwürfe ab. **Jetzt senden** verschickt sofort. Für den ersten Test Entwürfe wählen.
- Adressen, die in `protokoll.csv` schon stehen, werden beim nächsten Start übersprungen. Die Datei kann in der Seite über **Protokoll laden** geöffnet werden.

## Neuere Excel-Liste

In einer echten Runde **Neuere Excel-Liste laden** wählen. Die Spaltennamen müssen gleich bleiben (`video_title`, `video_owner_email`, `video_url`, `last_viewed`, `channel_owner_email`). **Mitgelieferte Liste** stellt die Datei vom 4. Mai 2026 wieder her.

Die mitgelieferte Liste enthält interne E-Mail-Adressen und bleibt intern.
