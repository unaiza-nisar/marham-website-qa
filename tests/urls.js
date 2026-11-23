// The pages the agent watches. Paths only; baseURL comes from playwright.config.js.
const KEY_PAGES = [
  '/',
  '/doctors/pediatrician',
  '/doctors/gastroenterologist',
  '/doctors/urologist',
  '/doctors/lahore/pediatrician',
  '/doctors/karachi/gastroenterologist',
  '/doctors/lahore/urologist',
  '/doctors/dermatologist',
  '/doctors/lahore/dermatologist',
  '/doctors/gynecologist',
  '/labs',
  '/medicines',
  '/surgeries',
];

// The 19 doctor profiles under 50/50 testing.
const AB_PROFILES = [
  '/doctors/lahore/dermatologist/dr-umer-mushtaq',
  '/doctors/lahore/dermatologist/dr-aisha-ahmad',
  '/doctors/karachi/dermatologist/dr-anita-kazi',
  '/doctors/hyderabad/dermatologist/dr-rauf-haroon-memon',
  '/doctors/lahore/dermatologist/prof-dr-nadia-ali-azfar',
  '/doctors/lahore/gynecologist/prof-dr-shamila-ijaz-munir',
  '/doctors/lahore/gynecologist/prof-dr-shamayela-hanif',
  '/doctors/karachi/gynecologist/dr-kanwal-zehra-zaidi',
  '/doctors/lahore/immunologist/prof-dr-nadeem-afzal',
  '/doctors/lahore/internal-medicine/assoc-prof-dr-mohammad-atiq-ur-rehman',
  '/doctors/lahore/general-surgeon/prof-dr-syed-imran-hussain-andrabi',
  '/doctors/karachi/neuro-physician/asst-prof-dr-shazia-jatoi',
  '/doctors/lahore/dentist/dr-imran-zia',
  '/doctors/karachi/nephrologist/dr-anita-haroon',
  '/doctors/lahore/dermatologist/dr-muhammad-amjad',
  '/doctors/islamabad/internal-medicine/dr-muhammad-salman',
  '/doctors/lahore/psychiatrist/asst-prof-dr-naseem-chaudhry',
  '/doctors/lahore/dentist/dr-asdaq-asim',
  '/doctors/lahore/gynecologist/assoc-prof-dr-misbah-malik',
];

// Only these profiles may be used for booking-flow tests. Never a real doctor.
const TEST_PROFILES = [
  '/doctors/lahore/dermatologist/prof-dr-ehsan-bhatti-testing-account',
  '/doctors/lahore/psychiatrist/dr-unaiza-nisar-testing-account',
  '/doctors/lahore/psychiatrist/dr-momina-testing',
];

// Pages that are fully on the new (Next.js) site; a revert to legacy is a bug.
const EXPECT_NEW_STACK = [
  '/doctors/pediatrician',
  '/doctors/gastroenterologist',
  '/doctors/urologist',
  '/doctors/lahore/pediatrician',
  '/labs',
  '/medicines',
  '/surgeries',
];

module.exports = { KEY_PAGES, AB_PROFILES, TEST_PROFILES, EXPECT_NEW_STACK };
