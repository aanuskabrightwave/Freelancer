const fs = require('fs');
const path = require('path');

const files = [
  'app/freelancer/services/page.tsx',
  'app/freelancer/services/[id]/edit/page.tsx',
  'app/freelancer/availability/page.tsx',
  'app/freelancer/bookings/page.tsx',
  'app/freelancer/messages/page.tsx',
  'app/freelancer/earnings/page.tsx',
  'app/freelancer/earnings/payouts/page.tsx',
  'app/freelancer/reviews/page.tsx',
  'app/freelancer/settings/page.tsx',
  'app/client/bookings/page.tsx',
  'app/client/messages/page.tsx',
  'app/client/reviews/page.tsx',
  'app/client/settings/page.tsx'
];

let found = false;
files.forEach(f => {
  const fp = path.join('c:/Users/Admin/Desktop/Freelancer/Freelancer/frontend/src', f);
  if (fs.existsSync(fp)) {
    const content = fs.readFileSync(fp, 'utf8');
    const regex = /(slate-|zinc-|gray-|neutral-|stone-|indigo-|blue-|bg-\[#|text-\[#|border-\[#|bg-white|text-black|border-black)/g;
    const matches = content.match(regex);
    if (matches) {
      console.log(f, 'has hardcoded colors:', [...new Set(matches)]);
      found = true;
    }
  } else {
    console.log('Not found:', fp);
  }
});

if (!found) console.log('ALL CLEAN!');
