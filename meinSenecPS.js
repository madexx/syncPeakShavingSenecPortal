const puppeteer = require('puppeteer');

// ioBroker Objekte
const capacityLimit = 'openknx.0.Wärmepumpe__Lüftung__Dunstabzug_&_Energiespeicher.Sollwert.Senec|Sollwert|PeakShavingCapacityLimit';
const endzeit = 'openknx.0.Wärmepumpe__Lüftung__Dunstabzug_&_Energiespeicher.Sollwert.Senec|Sollwert|PeakShavingEndzeit';
const mode = 'openknx.0.Wärmepumpe__Lüftung__Dunstabzug_&_Energiespeicher.Sollwert.Senec|Sollwert|PeakShavingMode';

// Defaultwerte
const DEFAULT_MODE = 1;
const DEFAULT_CAPACITY_LIMIT = 50;
const DEFAULT_END_HOUR = 14;

// Funktion zur Umwandlung des PS Moduswertes in einen String
function getModeString(modeValue) {
  switch (modeValue) {
    case 0:
      return 'DEACTIVATED';
    case 1:
      return 'MANUAL';
    case 2:
      return 'AUTO';
    default:
      return '';
  }
}

// Anmeldedaten vom Senec Portal
const username = 'deine@email.de';
const password = '***';

// Erstellen der States
createState(capacityLimit, DEFAULT_CAPACITY_LIMIT, {
  name: 'Kapazitätsbegrenzung',
  desc: 'Objekt zum Ändern der Kapazitätsbegrenzung',
  type: 'number'
});

createState(endzeit, getUnixTimestampForToday(DEFAULT_END_HOUR + 2), {
  name: 'Endzeit',
  desc: 'Objekt zur Einstellung der Endzeit',
  type: 'number'
});

createState(mode, DEFAULT_MODE, {
  name: 'Modus',
  desc: 'Objekt zur Auswahl des Modus',
  type: 'string'
});



// Funktion zur Berechnung des Unix-Timestamps für heute mit der gegebenen Stunde
function getUnixTimestampForToday(hour) {
  const date = new Date();
  date.setHours(hour + 2, 0, 0, 0);
  return date.getTime();
}

// Überwachung der Änderungen an den States
on(capacityLimit, function(obj) {
  updatePeakShavingSettings();
});

on(endzeit, function(obj) {
  updatePeakShavingSettings();
});

on(mode, function(obj) {
  updatePeakShavingSettings();
});

// Funktion zum Aktualisieren der Peak Shaving-Einstellungen
async function updatePeakShavingSettings() {
  console.log('Browser wird gestartet');
  const browser = await puppeteer.launch({ args: ['--no-sandbox'], executablePath: '/usr/bin/chromium-browser' });
  
  const page = await browser.newPage();

  await page.goto('https://mein-senec.de/auth/login');

  await page.waitForSelector('#login');
  await page.type('#login', username);
  await page.type('#password', password);

  await page.click('#loginButton');
  console.log('Anmeldung wird durchgeführt');
  await page.waitForNavigation();

  if (page.url() === 'https://mein-senec.de/endkunde/#/anlagen') {
    console.log('Anmeldung erfolgreich');

    const currentMode = getModeString(getState(mode).val);
    const saveSettingsURL = `https://mein-senec.de/endkunde/api/peakshaving/saveSettings?anlageNummer=0&mode=${currentMode}&capacityLimit=${getState(capacityLimit).val}&endzeit=${getUnixTimestampForToday(getState(endzeit).val)}`;

    await page.goto(saveSettingsURL);

    console.log('PS eingestellt, Browser wird geschlossen');

    await browser.close();

    console.log('Einstellung für das Peak Shaving erfolgreich geändert.');
    console.log(saveSettingsURL);
  }
}
