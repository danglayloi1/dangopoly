// Plays a short online game against the room server with three pretend phones, and checks it.
//   npm run server          (in another terminal: the server on this computer)
//   npm run server:check
// Against the deployed server: DANGOPOLY_SERVER=wss://dangopoly-server.<name>.workers.dev npm run server:check

const SERVER = process.env.DANGOPOLY_SERVER ?? 'ws://localhost:8787';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const code = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

let failed = 0;
const check = (ok, what) => {
  if (!ok) failed++;
  console.log(`${ok ? 'CHECK OK' : 'CHECK FAILED'}: ${what}`);
};

/** A pretend phone: sends messages and waits for the replies it expects. */
function phone(name) {
  const ws = new WebSocket(`${SERVER}/room/${code}`);
  const inbox = [];
  const waiting = [];
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    const i = waiting.findIndex((w) => w.test(msg));
    if (i >= 0) waiting.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', () => reject(new Error(`${name} could not connect to ${SERVER}`)));
  });
  return {
    name,
    opened,
    send: (msg) => ws.send(JSON.stringify(msg)),
    close: () => ws.close(),
    /** The next message (already received or still to come) that passes `test`. */
    next(test, what = 'a reply') {
      const i = inbox.findIndex(test);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${name} got no ${what}`)), 5000);
        waiting.push({ test, resolve: (m) => (clearTimeout(timer), resolve(m)) });
      });
    },
  };
}

const roomWhere = (test) => (m) => m.t === 'room' && test(m.room);
const errorOf = (m) => m.t === 'error';

const a = phone('Đăng');
const b = phone('Lan');
const c = phone('Minh');
await Promise.all([a.opened, b.opened, c.opened]);
console.log(`room ${code} on ${SERVER}`);

// Lobby
a.send({ t: 'create', profile: { name: 'Đăng', token: 'nonLa', color: 'red' } });
const aWelcome = await a.next((m) => m.t === 'welcome', 'welcome');
check(aWelcome.seat === 0 && typeof aWelcome.key === 'string', 'the creator gets seat 0 and a seat key');

b.send({ t: 'look' });
const looked = await b.next(roomWhere((r) => r.seats.length === 1), 'room view');
check(looked.room.you === null && looked.room.seats[0].name === 'Đăng', 'a phone can look at the lobby before joining');

b.send({ t: 'join', profile: { name: 'Lan', token: 'nonLa', color: 'indigo' } });
check((await b.next(errorOf)).code === 'tokenTaken', 'a token already taken is refused');
b.send({ t: 'join', profile: { name: 'Lan', token: 'conTrau', color: 'indigo' } });
const bWelcome = await b.next((m) => m.t === 'welcome', 'welcome');
c.send({ t: 'join', profile: { name: 'Minh', token: 'quaCam', color: 'green' } });
await c.next((m) => m.t === 'welcome', 'welcome');
const lobby = await a.next(roomWhere((r) => r.seats.length === 3), 'lobby with 3 players');
check(lobby.room.seats.every((s) => s.online), 'everyone shows as online in the lobby');

b.send({ t: 'start', startingCash: 15_000_000, firstTurn: 'roll' });
check((await b.next(errorOf)).code === 'notHost', 'only the host can start');

// The game
a.send({ t: 'start', startingCash: 15_000_000, firstTurn: 'roll' });
const started = await a.next(roomWhere((r) => r.stage === 'playing'), 'started game');
const { game, firstTurn, seats } = started.room;
check(game.players.length === 3 && game.players.every((p) => p.cash === 15_000_000), 'the game starts with 3 players and their money');
check(Array.isArray(firstTurn) && firstTurn.length >= 1, `the server rolled for who goes first (${seats[0].name} starts)`);

const phones = [a, b, c];
const bySeat = (seat) => phones.find((p) => p.name === seats[seat].name);
const first = bySeat(game.current);
const other = bySeat((game.current + 1) % 3);

other.send({ t: 'act', action: { type: 'ROLL' } });
check((await other.next(errorOf)).code === 'notYourMove', 'a player cannot move on someone else’s turn');

first.send({ t: 'act', action: { type: 'ROLL', dice: [6, 6] } });
const rolled = await other.next(roomWhere((r) => r.game?.dice != null), 'the roll');
check(rolled.room.game.log.some((e) => e.type === 'rolled'), 'everyone sees the roll');

// Reconnecting
b.close();
const offline = await a.next(roomWhere((r) => r.seats.some((s) => s.name === 'Lan' && !s.online)), 'Lan offline');
check(Boolean(offline), 'a phone that disconnects shows as offline');
const b2 = phone('Lan again');
await b2.opened;
b2.send({ t: 'rejoin', key: bWelcome.key });
const back = await b2.next((m) => m.t === 'welcome', 'welcome back');
check(seats[back.seat].name === 'Lan', 'Lan gets her seat back with her key');
b2.send({ t: 'rejoin', key: 'not-a-key' });
check((await b2.next(errorOf)).code === 'badSeatKey', 'an unknown seat key is refused');

// Bad messages
a.send({ t: 'act', action: { type: 'HACK' } });
check((await a.next(errorOf)).code === 'badMessage', 'unknown moves are refused');
a.send('x'.repeat(9000));
check((await a.next(errorOf)).code === 'badMessage', 'oversized messages are refused');

for (const p of [a, b2, c]) p.close();
console.log(failed === 0 ? 'ALL SERVER CHECKS PASSED' : `${failed} SERVER CHECKS FAILED`);
process.exit(failed === 0 ? 0 : 1);
