// Game data - cards for the game

export const slights = [
  "You didn't use your turn signal when changing lanes.",
  "You left one second on the microwave instead of clearing it.",
  "You took the last slice of pizza without asking.",
  "You replied 'K' to a long text.",
  "You farted in a sealed elevator.",
  "You FaceTimed someone in a public restroom.",
  "You left the loaf of bread open.",
  "You drove slowly in the fast lane.",
  "You clapped when the plane landed.",
  "You chewed with your mouth open while making direct eye contact.",
  "You got drunk at your kid's T-ball game.",
  "You left your wet laundry in the machine for hours.",
  "You loudly cracked your knuckles in a silent room.",
  "You took the batteries out of the remote and didn't put them back.",
  "You ruined a surprise party.",
  "You said \"just a minute\" six hours ago."
];

export const curses = [
  "May your shower always be just slightly too cold.",
  "May your phone charger only work at a weird angle.",
  "May you always get a popcorn kernel stuck in your teeth.",
  "May you always feel like you forgot something, but you didn't.",
  "May your socks always be slightly damp.",
  "May every TV show you love get canceled after one season.",
  "May your earbuds always be tangled.",
  "May your pillow always be warm.",
  "May every shopping cart you grab have a wobbly wheel.",
  "May your phone battery percentage lie to you.",
  "May your seatbelt lock when you're in a hurry.",
  "May your keyboard miss one letter every time you type a password.",
  "May your favorite pen leak ink at the worst moment.",
  "May your socks always slide down into your shoe halfway through the day.",
  "May your printer jam every time you're in a rush."
];

export function drawHand(deck: string[]): string[] {
  const shuffled = [...deck].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

export function drawRandom(deck: string[]): string {
  return deck[Math.floor(Math.random() * deck.length)];
}

export function nextJudge(players: string[], current: string): string {
  const idx = players.indexOf(current);
  return players[(idx + 1) % players.length];
}