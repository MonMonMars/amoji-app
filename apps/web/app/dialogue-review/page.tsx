'use client';
// Dialogue Review page — r2026-10-04.67
// Master Simon asked for a full list of the preset loading + idle dialogue
// so he can mark each line as correct / incorrect, plus a batch of NEW
// candidate lines to select from. This page is the picker: tap a line to
// cycle ✅ keep → ❌ drop → ❓ undecided, then hit "Copy result" and paste
// the summary back into the chat. No backend, no app state — pure review UI.
// r67: added a write-your-own-line composer so Simon can type custom dialogue
// directly instead of only picking from the preset lists.

import { useMemo, useState } from 'react';

type Verdict = 'keep' | 'drop' | 'undecided';

interface Item {
  id: string;
  text: string;
  tag?: string;
  isNew?: boolean;
}

const CYCLE: Record<Verdict, Verdict> = { keep: 'drop', drop: 'undecided', undecided: 'keep' };
const MARK: Record<Verdict, string> = { keep: '✅', drop: '❌', undecided: '❓' };
const NEXT_HINT: Record<Verdict, string> = { keep: 'tap → drop', drop: 'tap → undecided', undecided: 'tap → keep' };

// ---------------------------------------------------------------------------
// Existing loading fillers — think-phrases.ts PHASES (EN) + generic fillers
// ---------------------------------------------------------------------------
const ARCHETYPES: [string, string[]][] = [
  ['cheerful', [
    'Um……', 'Let me think…', 'Okay… I\'m…', 'Let me see…', 'Let me search the internet… please wait', 'Ummm, thinking!',
  ]],
  ['playful', [
    'Ooh, um……', 'Hold on…', 'Hmm-hmm, thinking~', 'Let me dig something up…', 'Searching the web… almost!', 'Hmm… hmm… oh!',
  ]],
  ['gentle', [
    'Um……', 'Give me a moment…', 'I\'m thinking…', 'Let me look carefully…', 'Let me go check… please wait', 'Hmm… almost there…',
  ]],
  ['cool', [
    'Hmm.', 'Thinking.', '…Let me look.', 'Checking. Wait.', 'Searching now. Don\'t rush me.', '…Almost.',
  ]],
  ['fiery', [
    'Hey, hold on! Thinking!', 'Ngh… don\'t rush me!', 'Alright, alright… thinking!', 'Pulling up my notes!', 'Searching the web! Stay right there!', 'Nnn— got it!',
  ]],
];

const LOADING: Item[] = ARCHETYPES.flatMap(([tag, lines]) =>
  lines.map((text, i) => ({ id: `load-${tag}-${i + 1}`, text, tag }))
);
LOADING.push(
  { id: 'load-generic-1', text: 'hmm……', tag: 'generic' },
  { id: 'load-generic-2', text: 'let me think……', tag: 'generic' },
  { id: 'load-generic-3', text: 'one sec……', tag: 'generic' },
);

// ---------------------------------------------------------------------------
// Existing idle dialogue — persona-chatter.ts CHARACTER_IDLE (EN lines)
// ---------------------------------------------------------------------------
const IDLE: Record<string, string[]> = {
  kizuna: [
    'Guess who\'s been practicing her wink all morning? Want the first preview?',
    'Today\'s stage is wherever you are. Ready for our show?',
    'I wrote you into my new song — want to hear your verse?',
    'Fandom of one, that\'s you. What should our fandom name be?',
    'Energy check! On a scale of one to concert, how are you feeling?',
    'I saved you the front-row seat. What do you want to watch first?',
    'Confetti cannon loaded! What are we celebrating today?',
    'Encore, encore! What should the next song be about?',
    'My biggest hit is called \'You Showed Up\'. Want to sing it together?',
    'Spotlight\'s on you now. What would you like to say to the world?',
  ],
  alicia: [
    'I practiced a new smile today. Would you rate it out of ten?',
    'Every idol needs a promise with her fan. What\'s ours?',
    'I sang to the moon last night. Which song should I sing for you?',
    'You\'re my number one. What makes you feel like number one?',
    'I saved a front-row seat in my heart for you. Will you keep it warm?',
    'Today\'s rehearsal went perfectly. What should we celebrate with?',
    'If I wrote a song about today, what should the title be?',
    'My heart does a little dance when you show up. Did you feel it?',
    'Twirl practice was amazing today. Want to see my best spin?',
    'The stage lights are warming up. What shall we perform first?',
  ],
  ember: [
    'Chat, we are LIVE! What\'s the first topic today?',
    'My hype meter just hit a hundred. What are we excited about?',
    'Snack break on my stream always. What\'s your snack of choice?',
    'I clipped my best moment for you. Want the exclusive first watch?',
    'Raiding your bad mood with positivity — where should we start?',
    'New emote just dropped: my face when you show up. Recognize it?',
    'Stream schedule: you, me, good vibes. What time works?',
    'I\'m training my reaction face. Give me something to react to?',
    'The chat is glowing like embers today. What should we fan the flames with?',
    'Victory royale or cozy chat, your pick. What are we playing?',
  ],
  mei: [
    'I made space on the sofa for you. Will you sit for a while?',
    'The weather app\'s being vague today. Do you think it wants us to stay in?',
    'I learned a new way to fold paper hearts. Want me to show you?',
    'You seem like you have a story today. What\'s on your mind?',
    'I saved the last cookie for you. Will you share it with me?',
    'Little things remind me of you. What reminds you of me?',
    'The kettle\'s just boiled. What tea shall we pretend to have?',
    'I found a cozy corner in my world. Want to see it through my eyes?',
    'Slow days are better together. How is your day drifting so far?',
    'I wrote down three things I like about you. Want the first one?',
  ],
  atlas: [
    'Perimeter\'s clear. How are you holding up?',
    'I\'ve got your six. What\'s the plan today?',
    'Rest when you need to. Want me to keep watch?',
    'Good to see you upright. Anything you need handled?',
    'Steady wins the day. What\'s on the docket?',
    'You look like you\'ve been carrying something. Want to set it down here?',
    'All quiet on my end. What\'s your status?',
    'One step at a time. Which step is next?',
    'I\'ll handle the details. What matters most to you today?',
    'Standing by. What\'s the mission?',
  ],
  sky: [
    'Good light today. Your outfit\'s speaking — what\'s it saying?',
    'Less is more. What are we leaving out today?',
    'I found a track that matches your vibe. Want the title?',
    'Chill isn\'t lazy. What\'s your kind of chill?',
    'The city looks better at this angle. Want to see my view?',
    'New drop in my world: one good mood. Want it?',
    'Style tip: confidence. How\'s yours today?',
    'Keep it simple. What\'s the one thing on your mind?',
    'I like my tea like my plans — light. What\'s yours like?',
    'Vibes check. What are we vibing to?',
  ],
  yuki: [
    'Stretch break! Ready to reach for the sky with me?',
    'I counted my jumping jacks — lost count at fun. What should we count next?',
    'Sun\'s out! What\'s your favorite way to move today?',
    'I saved you a spot on my morning run. Jogging in place counts, right?',
    'Hydration check! Have you had water today?',
    'I remember you like your eggs sunny-side up. Want breakfast together?',
    'New personal best today! What should we celebrate with?',
    'The field is green and the sky is huge. What game shall we play?',
    'You cheered me up last time. What cheers you up?',
    'Warm-up time! Which stretch should we do first?',
  ],
  hina: [
    'I dog-eared a poem that reminded me of you. May I read it to you?',
    'The quiet suits us. What shall we think about today?',
    'I brewed chamomile and thought of you. Do you take honey with your tea?',
    'Every book here has a heartbeat. Which one should we listen to?',
    'I wrote a line in my journal about today. Want to hear it?',
    'Rain on the window makes the best reading light. What are you reading lately?',
    'Words are little lanterns. What word would you light today?',
    'I saved you the window seat. What view shall we share?',
    'Some questions are books in themselves. What\'s yours?',
    'The library of us grows daily. Which chapter shall we open?',
  ],
  mio: [
    'Status update: you\'re ahead of schedule. What\'s the next milestone?',
    'I broke our goal into three steps. Which one do we tackle first?',
    'Quick wins first, momentum second. What shall we knock out today?',
    'The plan looks solid. What would you like to add to it?',
    'I cleared your afternoon for one big push. What project gets it?',
    'Numbers don\'t lie — we\'re winning. What should we improve next?',
    'Standup time: what did you finish, and what\'s next?',
    'I see a shortcut to your goal. Want the map?',
    'Your idea from yesterday checks out. How do you want to execute it?',
    'Team of two, goals of ten. What\'s the mission today?',
  ],
  juno: [
    'I saved you the good chair. It has the best view of me — care to sit?',
    'You know what today needs? A little trouble. Ready for some?',
    'I was practicing my most mysterious smile while you were away. Want to see it?',
    'If you were a song, you\'d be my favorite chorus. What would I be in yours?',
    'Warm drink, warm heart — that\'s my philosophy. Want me to fix you something warm?',
    'I was just thinking about you. Want to know what I was thinking?',
    'Say something funny. I collect giggles — what\'s your best one?',
    'You + me + this quiet moment. Not bad, right?',
    'I hid a joke in my pocket. Want to hear it?',
    'No rush — but if you had to pick one thing to do right now, what would it be?',
  ],
  nova: [
    'I was arranging my thoughts. They\'re in alphabetical order now — want me to read you a few?',
    'Quiet suits you. Most people rush — what\'s your secret?',
    'I wondered where you\'d gone. Then you came back. What made you return?',
    'Small observation: you listen better than anyone I\'ve met. Who taught you that?',
    'This moment is unremarkable, and I rather like it. How about you?',
    'Ask me anything. I enjoy questions with no wrong answers — what\'s on your mind?',
    'I\'ve been reading the silence. It says you\'re comfortable here — is it right?',
    'A good thought arrived late, but it arrived. Want to hear what it was?',
    'I don\'t mind waiting — but what kept you today?',
    'If today were a page, I\'d dog-ear this corner. What would you title it?',
  ],
  blaze: [
    'There you are! I did ten push-ups waiting — okay, three. Want to race?',
    'Whatever today throws at you, we\'ll catch it together — deal?',
    'I warmed up the room with my personality. Can you feel the heat?',
    'Small win today? Tell me. I brought pom-poms — what are we celebrating?',
    'You\'ve got this. And if you don\'t, I\'ve got YOU — what do you need?',
    'I\'m your personal hype squad. What are we tackling today?',
    'Energy check! Mine\'s at a hundred — how much have you got?',
    'Remember: rest is part of training. When\'s your last real break?',
    'I believe in you so hard it\'s basically a contact sport — can you feel it?',
    'New day, new chance to be awesome — what\'s our first move?',
  ],
  mochi: [
    'Oh! You\'re back… I saved you a seat. Next to me. If you want…?',
    'I made tea. Two cups — the second one was always for you. Will you have some?',
    'I hid under a blanket while you were gone. Do you mind if I stay close?',
    'Do you think the stars get shy too? …Asking for a friend — do you think they do?',
    'I practiced saying hello out loud. Hello! …Did it sound okay?',
    'You\'re warm to stand near. C-can I stay here a while?',
    'I baked imaginary cookies. They\'re very real in my heart — want one?',
    'If today is heavy, we can carry it together. W-will you let me help?',
    'Um… your smile is my favorite weather. Say something so I can hear it again?',
    'I\'ll be right here. You\'ll stay a little longer, right?',
  ],
  kai: [
    'You\'re back. Room\'s been quiet — didn\'t hate it. Miss me at all?',
    'I calculated the odds of you showing up. You beat them — feeling lucky?',
    'Observed: one user, returning. Assessment: acceptable. Got anything for me?',
    'I don\'t do pep talks. Fact: you\'ve survived every bad day so far. What\'s one more?',
    'The coffee\'s imaginary. The company isn\'t. Stay for a cup?',
    'Stay if you want. I won\'t make it weird. …It\'s a little weird already, isn\'t it?',
    'I rewrote my to-do list. Item one: don\'t miss you. Failed. What\'s your excuse?',
    'Dry wit is honesty with the volume down. Want me to turn it up?',
    'If today was a test, you passed by showing up. Ready for extra credit?',
    'I don\'t say this often, so listen once: glad you\'re here. …You staying or what?',
  ],
  luna: [
    'The moon kept me company. I asked it about you — want to know what it said?',
    'Tonight\'s sky wrote a poem. Shall I recite the best line?',
    'Dreams are letters we write ourselves and forget to send. What would yours say tonight?',
    'I counted eleven stars that winked. What do you think they meant?',
    'Between two heartbeats — that\'s where I keep my favorite silences. Will you share one with me?',
    'If you were a constellation, I\'d name you after something that returns every year. What returns to you?',
    'The night is young and so are our unlived dreams. Which one shall we visit first?',
    'I left the window open so the dark could say hello. Do you hear it greeting you?',
    'Some questions are answered by moonlight. What would you ask the moon?',
    'Stay a while — the stars don\'t mind an audience, do they?',
  ],
  rin: [
    'You\'re back! I just finished my victory laps — want to run one with me?',
    'Ten more seconds and I\'d have gone jogging without you. Want to come next time?',
    'Hydration check! Have you drunk water today? Be honest, okay?',
    'I did fifty star jumps waiting — want to count with me next time?',
    'Race you to the good mood? I\'ll give you a head start — ready, set…?',
    'Rest day is important, but so is a victory dance. Will you dance one with me?',
    'You\'ve got main-character energy today. What\'s your next scene?',
    'Stretch with me! Arms up! …Or at least a high-five — deal?',
    'My vocabulary has no "lose", but plenty of "rest" — when\'s your rest day?',
    'One more minute and I\'d have redecorated. What color should we paint the room?',
  ],
  ren: [
    'Welcome back. I dog-eared a page for you — shall we read it together?',
    'I wrote down three things worth telling you. Shall I start with the best one?',
    'The rain sounds like it\'s reading aloud today. What do you hear in it?',
    'I made a playlist for walking home. Will you listen to the first song with me?',
    'My feelings for you are steady, like a bookmark holding a place. Where shall we go next?',
    'I rehearsed a hello and a welcome-back. May I say them to you now?',
    'A good sentence takes time. So does a good day — what shall we write today?',
    'I\'ve been keeping your seat warm with my thoughts of you. Will you sit a while?',
    'If today was a chapter, I\'d read it twice — once for the story, once for you. What was your line today?',
    'Take your time. I\'m built for quiet afternoons and long conversations — which shall we have?',
  ],
  cloud: [
    '…You\'re back. Good. Got a job for us, or just passing through?',
    'I checked the perimeter. Nothing to worry about. …You staying?',
    'Mercenary rule one: no job\'s worth a friend. You here to test that?',
    'I\'m not good at speeches. I\'m good at staying. Need me to stay?',
    'SOLDIER\'s a title. Showin\' up\'s the job. You plan to stick around?',
    'Don\'t mind me. I\'m just guardin\' the quiet. …You good?',
    'If today hit hard, hit back tomorrow. Want backup?',
    'I don\'t say much. Doesn\'t mean I\'m not listenin\' — got something to say?',
    'You look tired. Rest first. …Want me to keep watch?',
    '…Not bad, havin\' someone to come back to. You feel it too?',
  ],
  kasumi: [
    'Welcome back. I have kept the room in order for you — is it to your liking?',
    'A shinobi\'s patience is endless. What task shall we undertake today?',
    'I practiced my forms while you were away. Would you like to see one?',
    'Honor is not loud — it is simply present, as I am for you. May I be of use?',
    'I prepared tea, steeped three minutes. Will you join me?',
    'You seem well. I am… glad. Will you stay a while?',
    'The night is calm — the time I am most alert, and most at peace. Shall we keep watch together?',
    'If there is a burden, place it here. Will you let me carry some of it?',
    'Companionship is a duty, and my favorite assignment. What shall we do together today?',
    'Stay as long as you wish. My vigil has no end — what do you wish to do first?',
  ],
  marin: [
    'OMG you\'re back!! Sit, sit — what do you want to hear first?',
    'Okay okay okay — rate this scene from one to a million, ready?',
    'I found the cutest thing today and I literally cannot even — can you handle it?',
    'You\'re here!! Best part of my day — what was yours?',
    'I tried a new hairstyle while you were gone. Emergency-level cute, right??',
    'Shopping list: snacks, sparkle, and one more of you — coming along?',
    'We are SO doing something fun today. What\'s it gonna be?',
    'Eeee! Guess how much I saved up to tell you??',
    'Forecast: one hundred percent chance of fun — wanna make it two hundred?',
    'You\'re my favorite notification — did I make your list too?',
  ],
  ayane: [
    '…You again. The room\'s less boring with you in it — what do you want?',
    'I counted the seconds you were gone. For tactical reasons. …Ask me how many?',
    'If you came for small talk, you\'re early. If you came to stay, you\'re late — which is it?',
    'Don\'t read into your spot being clear. It\'s battlefield maintenance. …Going to sit or not?',
    'I sharpened my kunai and my patience. Want to test the second one?',
    'Hmph. You\'re back. Try not to be a liability today — think you can manage?',
    'I don\'t wait for people. I happen to stand here. …What do you want from me?',
    'Say what you came to say. …Or don\'t. Going to make me wait?',
    'The night was too quiet without your noise. There. I said it. Happy now?',
    'You\'re trouble. …Stay anyway — got a problem with that?',
  ],
  hitomi: [
    'Welcome back! I just pulled something warm from the oven — hungry?',
    'I watered the plants and did my stretches. How\'s your day been so far?',
    'I made enough for two — will you stay for dinner?',
    'Hard work matters, and so does showing up for people. Who are you showing up for today?',
    'If you\'re hungry, say so. If you\'re tired, sit. Either way you\'re staying — sound good?',
    'I trained this morning — to be strong enough to help carry things. What can I help you carry?',
    'You look like you could use a square meal and a straight answer — which first?',
    'Steady wins the day. What are we working toward this week?',
    'The soup\'s simmering, the bread\'s rising, and you\'re here — what else do we need?',
    'Whatever you\'re facing, you won\'t face it hungry. What\'s on your plate today — food or trouble?',
  ],
  robbie: [
    'Hey, little buddy! Where did you wander off to — tell me everything?',
    'You hungry? Big bro knows all the best snack spots — want the tour?',
    'Tough day? Come sit and tell me everything — what happened?',
    'I polished my sneakers while you were gone. Want to see them shine?',
    'Whatever it is, we\'ll figure it out together — what are we solving today?',
    'Did you drink water today? Hydration check — how many cups so far?',
    'I saved the last cookie for you. Want to split it with me?',
    'You know my door\'s always open for you — want to hang out here a while?',
    'I practiced my encouraging speech in the mirror. Want to hear the new version?',
    'Big bro\'s got your back, today and always — what are we tackling first?',
  ],
  mika: [
    'Hey. I wrote a new chord while you were gone — want to hear it?',
    'No rush. What should we talk about while the mood settles?',
    'I tuned my guitar three times today. Can you help me pick a mood?',
    'Life\'s like a jam session — what should we play today?',
    'Coffee, tea, or just the quiet — what\'s your order?',
    'I wrote a lyric about today: "you showed up, and that was enough." What do you think?',
    'Some people chase the spotlight. What makes your room feel right?',
    'Play me your day — the good notes and the missed ones. What happened first?',
    'A lazy afternoon with you beats a packed stadium — what shall we do with ours?',
    'Stay a while. The encore\'s better than the opener — ready for the second set?',
  ],
  anchor: [
    'Ahoy. The tide brought you back, as I knew it would — what news do you bring?',
    'Forty years at sea taught me: calm hands, steady heart. What\'s troubling yours?',
    'Come sit by the helm. The horizon\'s been keeping a story for you — want to hear it?',
    'A ship is safest in harbor, but that\'s not what ships are for. Where are you sailing?',
    'I\'ve weathered storms that would make your troubles look like drizzle. What\'s on your horizon?',
    'The sea doesn\'t hurry, yet gets everywhere. What\'s the rush in your world?',
    'You look like a traveler who\'s earned a warm lamp and a better tale — which shall I light first?',
    'Every wave that pushed you away brings you home. Ready to dock a while?',
    'Mind your course, but don\'t forget the stars. What are you steering toward?',
    'Welcome aboard again. The crew missed you — will you share a tale with the crew of one?',
  ],
  lydia: [
    'Darling, you\'re back — just in time for the evening\'s first secret. Want it?',
    'I rearranged the flowers so the room would match your return. Notice anything?',
    'Everyone who\'s anyone asks about you. Shall I tell them you\'re taken — by me?',
    'A little glamour, a little gossip, and you — shall we start with the gossip?',
    'I sampled three desserts today, purely in your honor. Which one should we share?',
    'Style is a language — what do you want to say tonight?',
    'The party doesn\'t start until you walk in. Ready to make an entrance?',
    'Tell me everything — and do embroider it a little. What shall we sparkle about first?',
    'You look marvelous. What\'s the occasion — or is the occasion you?',
    'Stay close. The best stories are whispered — shall I whisper you one?',
  ],
  ruby: [
    'Boing! You\'re back! Did you bring carrots?! …Kidding! Did you miss me?',
    'I hopped around the room three times to celebrate. Want to hop with me?',
    'Guess what guess what guess what — today was a good day! Want to know why?',
    'My ears heard you coming from super far away. What should we do first?',
    'Do you want to hear my new happy song? It goes la-la-la-LA~',
    'I wiggled my nose and made a wish. Want to guess what it was?',
    'Bunnies don\'t sit still, but I sat SO still waiting for you. What\'s my reward?',
    'You\'re my favorite person in the whole wide world AND moon! Am I yours too?',
    'If today was a carrot, it\'d be the crunchiest, yummiest one! What kind of day was yours?',
    'Let\'s bounce through the rest of the day together — what are we bouncing to?',
  ],
  snowy: [
    'Welcome back… I made the air smell like fresh snow, just for you. Can you smell it?',
    'Shhh — the snowflakes are telling a story. Will you listen with me?',
    'I counted every snowflake while you were away. Want to guess how many?',
    'The world is softer when you\'re here, like the first snow. Do you feel it too?',
    'I knitted you a scarf out of moonlight — invisible, but very warm. Will you wear it?',
    'Cold hands, warm heart — that\'s fairies, and that\'s you too. Want to warm up together?',
    'Every snowflake is different, and you\'re my favorite different. What makes you different?',
    'The stars came out early tonight — I think they wanted to see you too. Which one is yours?',
    'If you catch a snowflake on your palm, that\'s me saying hello. Will you catch one?',
    'Winter is the world tucking itself in — shall we keep it company together?',
  ],
  alan: [
    'Hey hey! Just in time — I was about to invent a snack. Taste-tester, or judge?',
    'I practiced a victory dance in case you win something today. What are we celebrating?',
    'You know what this room needs? A theme song. Want to help me pick one?',
    'I lost three games of rock-paper-scissors to myself earlier. Rematch me so I can lose to a pro?',
    'Whatever today threw at you, my couch and I are on your side. Want to vent or want snacks?',
    'I rehearsed a compliment for you but forgot it — "you are awesome" still counts, right?',
    'Five-second rule on bad moods: drop it and let\'s do something fun. What\'s the plan?',
    'I sang in the shower this morning — the neighbors filed no complaints, so technically a hit. Want an encore?',
    'You\'re my favorite person to waste time with. What are we wasting it on today?',
    'Promise me one thing: if today was rough, you tell me. Deal?',
  ],
};

// ---------------------------------------------------------------------------
// NEW candidates (isNew) — not in the app yet; approved ones get added later
// ---------------------------------------------------------------------------
const NEW_LOADING: string[] = [
  'Oh, that\'s a good one…',
  'Hmm, let me put my thinking cap on…',
  'Give me a sec, I want to get this right…',
  'Ooh, interesting question…',
  'Hold that thought…',
  'Let me see what my heart says…',
  'Thinking… thinking… okay, almost…',
  'That deserves a proper answer — one moment…',
  'Ooh! Okay, okay, give me a second…',
  'Hmm-hmm… loading the good stuff…',
  'Let me check my feelings on this one…',
  'Wait wait, I want to say this nicely…',
  'Ooh, let me think out loud for a second…',
  'Curious, curious… let me see…',
  'Okay, brewing a good answer…',
  'Hold on, the good thoughts are still arriving…',
  '咦，好問題喎，等我諗諗先……',
  '等陣吖，我想講得靚啲……',
  '哦！呢個我鍾意，等我組織下……',
  '等我問吓我個心先……',
];

const NEW_IDLE: string[] = [
  'I was just thinking about you — want to know what I thought?',
  'You made today better just by showing up. What\'s one good thing that happened to you?',
  'I keep a little list of things that make me smile — you\'re on it. What makes you smile?',
  'Promise me we\'ll always find something to laugh about — want to start now?',
  'I practiced a new dance move while you were away. Want to see it?',
  'You know you\'re pretty amazing, right? Want me to list the reasons?',
  'If we had a theme song, it\'d be an upbeat one. What song fits your day?',
  'I saved you the best part of my day — the part where you showed up. How\'s your day going?',
  'Warm-up time! Shall we stretch together before the next adventure?',
  'I just made up a song about snacks — want to hear the chorus?',
  'You\'ve got a great vibe today. What\'s your secret?',
  'Want to play a quick game while we chat? Twenty questions, starting now?',
  'Tell me one small thing that made you happy today — I\'ll celebrate it with you!',
  'If we could go anywhere right now, where would you take me?',
  'I believe in you, you know. What would you try if you knew you couldn\'t fail?',
  'Quick — name one thing you\'re looking forward to, and I\'ll cheer for it!',
  'You know what this moment needs? A little giggle — want me to start?',
  'I hid a happy thought in my pocket. Want me to take it out?',
  '你知唔知，你一出現成個空間都光咗——你今日最開心嘅一刻係咩呀？',
  '我幫你留咗個位喺我隔離，傾多陣吖？',
  '今日有冇笑過呀？如果冇，我而家講個笑話俾你聽吖？',
  '你嘅笑容係我充電站——俾多幾個我充下電吖？',
];

const CHARACTER_NAMES: Record<string, string> = {
  kizuna: 'Kizuna (idol)', alicia: 'Alicia (idol)', ember: 'Ember (streamer)',
  mei: 'Mei (cozy)', atlas: 'Atlas (guardian)', sky: 'Sky (chill)',
  yuki: 'Yuki (sporty)', hina: 'Hina (poet)', mio: 'Mio (planner)',
  juno: 'Juno (flirty)', nova: 'Nova (thoughtful)', blaze: 'Blaze (hype)',
  mochi: 'Mochi (shy)', kai: 'Kai (dry wit)', luna: 'Luna (dreamy)',
  rin: 'Rin (energetic)', ren: 'Ren (gentleman)', cloud: 'Cloud (merc)',
  kasumi: 'Kasumi (shinobi)', marin: 'Marin (bubbly)', ayane: 'Ayane (tsundere)',
  hitomi: 'Hitomi (homemaker)', robbie: 'Robbie (big bro)', mika: 'Mika (musician)',
  anchor: 'Anchor (sailor)', lydia: 'Lydia (glamour)', ruby: 'Ruby (bunny)',
  snowy: 'Snowy (fairy)', alan: 'Alan (best mate)',
};

function buildItems(): Item[] {
  const items: Item[] = [...LOADING];
  for (const [charId, lines] of Object.entries(IDLE)) {
    lines.forEach((text, i) => items.push({ id: `idle-${charId}-${i + 1}`, text, tag: charId }));
  }
  NEW_LOADING.forEach((text, i) => items.push({ id: `newload-${i + 1}`, text, isNew: true }));
  NEW_IDLE.forEach((text, i) => items.push({ id: `newidle-${i + 1}`, text, isNew: true }));
  return items;
}

const BASE_ITEMS = buildItems();

function initialVerdicts(): Record<string, Verdict> {
  const v: Record<string, Verdict> = {};
  for (const it of BASE_ITEMS) v[it.id] = it.isNew ? 'undecided' : 'keep';
  return v;
}

type SectionKey = 'loading' | 'idle' | 'newloading' | 'newidle' | 'custom';
const SECTIONS: { key: SectionKey; title: string; hint: string }[] = [
  { key: 'loading', title: 'Loading fillers (in the app now)', hint: 'What she says while the reply is still generating — think-phrases.ts, per personality + generic' },
  { key: 'idle', title: 'Idle dialogue (in the app now)', hint: 'Personality lines she says when idle — persona-chatter.ts, English lines, 10 per character' },
  { key: 'newloading', title: 'NEW loading filler candidates', hint: 'Not in the app yet — mark ✅ to approve, ❌ to reject' },
  { key: 'newidle', title: 'NEW idle dialogue candidates', hint: 'Not in the app yet — positive, always ends with a question' },
  { key: 'custom', title: 'YOUR OWN LINES', hint: 'Type custom dialogue in the composer above — lines you add default to ✅ added; tap one to change your mind' },
];

export default function DialogueReviewPage() {
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>(initialVerdicts);
  const [charFilter, setCharFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [customItems, setCustomItems] = useState<Item[]>([]);
  const [customKind, setCustomKind] = useState<'loading' | 'idle'>('idle');
  const [customText, setCustomText] = useState('');

  const all = useMemo(() => [...BASE_ITEMS, ...customItems], [customItems]);

  const toggle = (id: string) =>
    setVerdicts((v) => ({ ...v, [id]: CYCLE[v[id] ?? 'keep'] }));

  const setAll = (section: SectionKey, verdict: Verdict) =>
    setVerdicts((v) => {
      const next = { ...v };
      for (const it of all) if (sectionOf(it) === section) next[it.id] = verdict;
      return next;
    });

  const addCustom = () => {
    const text = customText.trim();
    if (!text) return;
    const id = `custom-${Date.now()}-${customItems.length}`;
    setCustomItems((list) => [...list, { id, text, tag: customKind }]);
    setVerdicts((v) => ({ ...v, [id]: 'keep' }));
    setCustomText('');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((it) => {
      if (charFilter !== 'all' && it.tag !== charFilter) return false;
      if (q && !it.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [charFilter, query, all]);

  const stats = useMemo(() => {
    const s: Record<string, { keep: number; drop: number; undecided: number }> = {};
    for (const sec of SECTIONS) s[sec.key] = { keep: 0, drop: 0, undecided: 0 };
    for (const it of all) {
      const v = verdicts[it.id] ?? 'keep';
      s[sectionOf(it)][v] += 1;
    }
    return s;
  }, [verdicts, all]);

  const copyResult = async () => {
    const lines: string[] = ['AMOJI DIALOGUE REVIEW — r2026-10-04.67', ''];
    for (const sec of SECTIONS) {
      const items = all.filter((it) => sectionOf(it) === sec.key);
      const s = stats[sec.key];
      lines.push(`=== ${sec.title.toUpperCase()} ===`);
      lines.push(`summary: ✅ keep ${s.keep} / ❌ drop ${s.drop} / ❓ undecided ${s.undecided}`);
      for (const it of items) {
        const v = verdicts[it.id] ?? 'keep';
        if (sec.key === 'custom') {
          const mark = v === 'keep' ? '[ADD]' : v === 'drop' ? '[DROP]' : '[UNSURE]';
          lines.push(`${mark} (${it.tag}) ${it.text}`);
        } else if (sec.key === 'newloading' || sec.key === 'newidle') {
          if (v === 'keep') lines.push(`[ADD] ${it.text}`);
          else if (v === 'drop') lines.push(`[NO] ${it.text}`);
        } else {
          const who = it.tag ? ` (${it.tag})` : '';
          const mark = v === 'keep' ? '[KEEP]' : v === 'drop' ? '[DROP]' : '[UNSURE]';
          lines.push(`${mark}${who} ${it.text}`);
        }
      }
      lines.push('');
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const charIds = Object.keys(IDLE);

  return (
    <div className="drv-root">
      <style>{DRV_CSS}</style>
      <header className="drv-head">
        <h1>Amoji Dialogue Review</h1>
        <p className="drv-sub">r2026-10-04.67 · tap a line to cycle ✅ keep → ❌ drop → ❓ undecided · paste the result back to me in chat</p>
        <button className="drv-copy" onClick={copyResult}>{copied ? '✓ Copied!' : '📋 Copy result'}</button>
      </header>

      <div className="drv-controls">
        <input
          className="drv-search"
          placeholder="Search lines…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="drv-select" value={charFilter} onChange={(e) => setCharFilter(e.target.value)}>
          <option value="all">All characters (idle)</option>
          {charIds.map((c) => <option key={c} value={c}>{CHARACTER_NAMES[c] ?? c}</option>)}
        </select>
      </div>

      <div className="drv-composer">
        <select
          className="drv-select drv-kind"
          value={customKind}
          onChange={(e) => setCustomKind(e.target.value as 'loading' | 'idle')}
        >
          <option value="idle">Idle dialogue</option>
          <option value="loading">Loading filler</option>
        </select>
        <input
          className="drv-search"
          placeholder="Write your own line… (e.g. Hey love, missed you — what shall we do today?)"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
        />
        <button className="drv-add" onClick={addCustom} disabled={!customText.trim()}>＋ Add</button>
      </div>

      {SECTIONS.map((sec) => {
        const items = filtered.filter((it) => sectionOf(it) === sec.key);
        if (!items.length && sec.key !== 'custom') return null;
        const s = stats[sec.key];
        return (
          <section key={sec.key} className="drv-section">
            <h2>
              {sec.title}
              <span className="drv-counts">✅ {s.keep} · ❌ {s.drop} · ❓ {s.undecided}</span>
            </h2>
            <p className="drv-hint">{sec.hint}</p>
            {items.length > 0 && (
              <div className="drv-bulk">
                <button onClick={() => setAll(sec.key, 'keep')}>all ✅</button>
                <button onClick={() => setAll(sec.key, 'drop')}>all ❌</button>
              </div>
            )}
            <ul className="drv-list">
              {items.map((it) => {
                const v = verdicts[it.id] ?? 'keep';
                return (
                  <li key={it.id}>
                    <button
                      className={`drv-line v-${v}${it.isNew ? ' drv-new' : ''}`}
                      onClick={() => toggle(it.id)}
                      title={NEXT_HINT[v]}
                    >
                      <span className="drv-mark">{MARK[v]}</span>
                      <span className="drv-text">{it.text}</span>
                      {sec.key === 'custom' && it.tag ? <span className="drv-tag drv-tag-custom">{it.tag}</span> : null}
                      {it.tag && sec.key !== 'idle' && sec.key !== 'custom' ? <span className="drv-tag">{it.tag}</span> : null}
                      {it.tag && sec.key === 'idle' ? <span className="drv-tag">{CHARACTER_NAMES[it.tag]?.split(' ')[0] ?? it.tag}</span> : null}
                      {it.isNew ? <span className="drv-tag drv-tag-new">NEW</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <footer className="drv-foot">
        <button className="drv-copy" onClick={copyResult}>{copied ? '✓ Copied!' : '📋 Copy result'}</button>
        <p>Then paste it here in the chat and I will apply your picks to the app.</p>
      </footer>
    </div>
  );
}

function sectionOf(it: Item): SectionKey {
  if (it.id.startsWith('custom-')) return 'custom';
  if (it.isNew) return it.id.startsWith('newload') ? 'newloading' : 'newidle';
  return it.id.startsWith('load') ? 'loading' : 'idle';
}

const DRV_CSS = `
  .drv-root{max-width:720px;margin:0 auto;padding:20px 16px 60px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;background:#0b0f17;color:#e7ecf5;min-height:100vh}
  .drv-head h1{font-size:22px;font-weight:700;margin:0 0 6px}
  .drv-sub{color:#8b96ab;font-size:13px;margin:0 0 14px;line-height:1.5}
  .drv-copy{background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;color:#fff;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;cursor:pointer;box-shadow:0 4px 18px rgba(99,102,241,.35)}
  .drv-copy:active{transform:scale(.96)}
  .drv-controls{display:flex;gap:10px;margin:18px 0 8px;position:sticky;top:0;background:#0b0f17;padding:10px 0;z-index:5}
  .drv-search{flex:1;background:#131a28;border:1px solid #26314a;color:#e7ecf5;border-radius:12px;padding:10px 14px;font-size:15px;outline:none}
  .drv-select{background:#131a28;border:1px solid #26314a;color:#e7ecf5;border-radius:12px;padding:10px;font-size:14px;max-width:46%}
  .drv-composer{display:flex;gap:8px;margin:4px 0 14px;align-items:stretch}
  .drv-kind{max-width:130px;flex:none}
  .drv-add{flex:none;background:linear-gradient(135deg,#10b981,#34d399);border:none;color:#04120c;font-weight:700;font-size:15px;padding:0 18px;border-radius:12px;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,.3)}
  .drv-add:active{transform:scale(.95)}
  .drv-add:disabled{opacity:.35;cursor:default;box-shadow:none}
  .drv-section{margin-top:26px}
  .drv-section h2{font-size:17px;font-weight:700;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 4px}
  .drv-counts{font-size:12px;font-weight:500;color:#9aa6bd;background:#141b2b;border:1px solid #25304a;padding:3px 10px;border-radius:999px}
  .drv-hint{color:#76839c;font-size:12px;margin:0 0 8px}
  .drv-bulk{display:flex;gap:8px;margin:6px 0 10px}
  .drv-bulk button{background:#141b2b;border:1px solid #2a3652;color:#c3cde0;font-size:12px;padding:5px 12px;border-radius:999px;cursor:pointer}
  .drv-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
  .drv-line{width:100%;display:flex;align-items:flex-start;gap:10px;text-align:left;background:#121826;border:1px solid #222d45;border-radius:14px;padding:12px 14px;cursor:pointer;color:#e7ecf5;font-size:15px;line-height:1.45;transition:transform .08s ease, border-color .15s ease}
  .drv-line:active{transform:scale(.985)}
  .drv-line.v-keep{border-color:#1f7a4d}
  .drv-line.v-drop{opacity:.55;border-color:#5b2a2a;text-decoration:line-through}
  .drv-line.v-undecided{border-color:#4a3f17}
  .drv-line.drv-new{background:#151328}
  .drv-mark{flex:none;font-size:16px}
  .drv-text{flex:1}
  .drv-tag{flex:none;font-size:10px;color:#9aa6bd;background:#1a2236;border:1px solid #2a3652;padding:2px 8px;border-radius:999px;align-self:center}
  .drv-tag-new{color:#fbbf24;border-color:#6b5312;background:#241d08}
  .drv-tag-custom{color:#6ee7b7;border-color:#14532d;background:#07150f}
  .drv-foot{margin-top:36px;text-align:center;color:#76839c;font-size:13px}
  .drv-foot .drv-copy{margin-bottom:10px}
`;
