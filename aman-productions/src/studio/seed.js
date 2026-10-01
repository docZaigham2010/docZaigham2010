// Fictional demo data for the client preview. Every person, client and figure here is invented.
import { uid, rel, today } from './lib.js';

const t = (title, status = 'todo', due = null, assignee = null) => ({ id: uid(), title, status, due, assignee });
const b = (category, item, estimate, actual = 0, vendor = '') => ({ id: uid(), category, item, estimate, actual, vendor });

// ── Production templates: what a new wedding / corporate event / film starts with ──
export const TEMPLATES = {
  event: {
    tasks: ['Discovery call & brief', 'Venue recce', 'Concept & moodboard', 'Vendor quotations', 'Budget sign-off', 'Guest logistics & stays', 'Run of show', 'Final walkthrough', 'Event day', 'Vendor settlement & wrap'],
    budget: [['Venue', 'Venue hire', .18], ['Décor & florals', 'Design, florals, installation', .22], ['Catering', 'Food & beverage', .2], ['Sound & light', 'PA, lighting rig, DJ', .1], ['Photo & film', 'Coverage & highlight film', .1], ['Logistics', 'Transport & stays', .08], ['Staffing', 'Coordinators & hospitality', .05], ['Contingency', '10% reserve', .07]],
    schedule: [['16:00', 'Vendors on site, final checks'], ['17:30', 'Guest arrivals & welcome'], ['18:30', 'Main ceremony / programme'], ['20:00', 'Dinner service'], ['21:30', 'Music & celebration'], ['23:30', 'Close & load-out']],
  },
  film: {
    tasks: ['Creative brief', 'Treatment & references', 'Script / shot list', 'Location recce', 'Permits', 'Casting', 'Crew & kit booking', 'Shoot', 'Offline edit', 'Client review', 'Colour grade', 'Sound mix', 'Final delivery'],
    budget: [['Pre-production', 'Treatment, script, recce', .1], ['Crew', 'Director, DOP, AC, gaffer, sound', .25], ['Equipment', 'Camera, lenses, lighting, grip', .15], ['Locations & permits', 'Fees and permissions', .08], ['Talent', 'Cast & extras', .1], ['Travel & stays', 'Unit transport & hotel', .08], ['Post-production', 'Edit, grade, sound', .17], ['Contingency', '10% reserve', .07]],
    shots: [['1', '1A', 'Establishing — wide of location at first light', 'WS', '24mm'], ['1', '1B', 'Detail — hands, textures, product', 'CU', '85mm'], ['2', '2A', 'Hero moment — subject walks into frame', 'MS', '35mm'], ['2', '2B', 'Reveal — aerial pull-back', 'Drone', '—']],
  },
};

export function seed() {
  const clients = [
    { id: 'cl1', name: 'Mehreen & Faisal', company: '', phone: '+91 90000 00001', email: 'mehreen.f@example.com', city: 'Srinagar', notes: 'Prefers WhatsApp. Families on both sides very involved.' },
    { id: 'cl2', name: 'Chinar Crafts Co.', company: 'Chinar Crafts Co.', phone: '+91 90000 00002', email: 'brand@chinarcrafts.example', city: 'Srinagar', notes: 'Handmade papier-mâché & pashmina brand. Wants a film for export buyers.' },
    { id: 'cl3', name: 'Valley Tech Summit', company: 'Valley Tech Collective', phone: '+91 90000 00003', email: 'events@valleytech.example', city: 'Srinagar', notes: 'Annual summit. Last year 300 attendees.' },
    { id: 'cl4', name: 'Zubair Lone', company: 'Lone Music', phone: '+91 90000 00004', email: 'zubair@lonemusic.example', city: 'Baramulla', notes: 'Independent musician. Single release in winter.' },
    { id: 'cl5', name: 'Saffron Heritage Hotels', company: 'Saffron Heritage Hotels', phone: '+91 90000 00005', email: 'marketing@saffronheritage.example', city: 'Pahalgam', notes: 'Boutique hotel group. Potential retainer.' },
    { id: 'cl6', name: 'Rafiq & Family', company: '', phone: '+91 90000 00006', email: 'rafiq.family@example.com', city: 'Anantnag', notes: '' },
  ];

  const crew = [
    { id: 'c1', name: 'Sahil Wani', role: 'Production manager', type: 'Crew', dept: 'Production', phone: '+91 90000 10001', email: 'sahil@example.com', dayRate: 6000, rating: 5, city: 'Srinagar' },
    { id: 'c2', name: 'Aamir Qureshi', role: 'Director of photography', type: 'Crew', dept: 'Camera', phone: '+91 90000 10002', email: 'aamir@example.com', dayRate: 15000, rating: 5, city: 'Srinagar' },
    { id: 'c3', name: 'Insha Bhat', role: 'Event coordinator', type: 'Crew', dept: 'Production', phone: '+91 90000 10003', email: 'insha@example.com', dayRate: 4500, rating: 4, city: 'Srinagar' },
    { id: 'c4', name: 'Frame House Post', role: 'Edit & colour', type: 'Vendor', dept: 'Post', phone: '+91 90000 10004', email: 'frames@example.com', dayRate: 12000, rating: 4, city: 'Srinagar' },
    { id: 'c5', name: 'Bloom Collective', role: 'Florals & set design', type: 'Vendor', dept: 'Décor', phone: '+91 90000 10005', email: 'bloom@example.com', dayRate: 40000, rating: 5, city: 'Srinagar' },
    { id: 'c6', name: 'Owais Mir', role: 'Gaffer', type: 'Crew', dept: 'Lighting', phone: '+91 90000 10006', email: 'owais@example.com', dayRate: 5000, rating: 4, city: 'Srinagar' },
    { id: 'c7', name: 'Soundscape Kashmir', role: 'PA, DJ & live sound', type: 'Vendor', dept: 'Sound', phone: '+91 90000 10007', email: 'sound@example.com', dayRate: 35000, rating: 4, city: 'Srinagar' },
    { id: 'c8', name: 'Wazwan Masters', role: 'Traditional catering', type: 'Vendor', dept: 'Catering', phone: '+91 90000 10008', email: 'wazwan@example.com', dayRate: 0, rating: 5, city: 'Srinagar' },
    { id: 'c9', name: 'Huma Shah', role: 'Camera operator / AC', type: 'Crew', dept: 'Camera', phone: '+91 90000 10009', email: 'huma@example.com', dayRate: 6000, rating: 4, city: 'Srinagar' },
    { id: 'c10', name: 'Tariq Dar', role: 'Sound recordist', type: 'Crew', dept: 'Sound', phone: '+91 90000 10010', email: 'tariq@example.com', dayRate: 5500, rating: 4, city: 'Ganderbal' },
  ];

  const projects = [
    {
      id: 'p1', code: 'AP-26-031', name: 'Mehreen & Faisal — The Lakeside Wedding', clientId: 'cl1', kind: 'event', service: 'Wedding', phase: 2, status: 'Active',
      startDate: rel(9), endDate: rel(10), location: 'Dal Lake, Srinagar', venue: 'Lakeside lawns + shikara arrivals', guests: 420, fee: 1850000,
      brief: 'A two-day celebration: a mehendi evening on the lawns, then the wedding with guests arriving by decorated shikara at golden hour. Colour story: saffron, ivory and deep teal.',
      crew: [{ crewId: 'c1', role: 'Production manager', rate: 6000, days: 4, call: '07:00' }, { crewId: 'c3', role: 'Coordinator', rate: 4500, days: 4, call: '08:00' }, { crewId: 'c5', role: 'Florals & décor', rate: 40000, days: 2, call: '06:00' }, { crewId: 'c7', role: 'Sound & DJ', rate: 35000, days: 2, call: '14:00' }, { crewId: 'c8', role: 'Catering', rate: 0, days: 2, call: '12:00' }],
      tasks: [t('Discovery call & brief', 'done'), t('Venue recce', 'done', null, 'c1'), t('Concept & moodboard', 'done', null, 'c5'), t('Vendor quotations', 'done', null, 'c1'), t('Shikara route & permissions', 'doing', rel(2), 'c1'), t('Guest logistics & stays', 'doing', rel(4), 'c3'), t('Run of show', 'todo', rel(5), 'c3'), t('Final walkthrough', 'todo', rel(8), 'c1'), t('Event day', 'todo', rel(9)), t('Vendor settlement & wrap', 'todo', rel(14))],
      budget: [b('Venue', 'Lakeside lawns, 2 days', 280000, 280000, 'Venue'), b('Décor & florals', 'Shikara florals, mandap, lawn installation', 420000, 260000, 'Bloom Collective'), b('Catering', 'Wazwan for 420, two evenings', 380000, 150000, 'Wazwan Masters'), b('Sound & light', 'PA, DJ, festoon & uplighting', 160000, 70000, 'Soundscape Kashmir'), b('Photo & film', 'Coverage + highlight film', 180000, 0), b('Logistics', 'Shikaras, guest transport', 95000, 30000), b('Staffing', 'Hospitality team', 60000, 0), b('Contingency', 'Reserve', 90000, 0)],
      schedule: [{ id: uid(), time: '15:30', title: 'Florals & décor complete, final checks', owner: 'c5', note: '' }, { id: uid(), time: '16:45', title: 'Shikaras depart Ghat 9 with first guests', owner: 'c1', note: 'Two boats per family group' }, { id: uid(), time: '17:30', title: 'Golden hour arrivals & welcome kahwa', owner: 'c3', note: '' }, { id: uid(), time: '18:15', title: 'Nikah ceremony', owner: 'c3', note: 'Sound check 17:00' }, { id: uid(), time: '19:30', title: 'Wazwan dinner service', owner: 'c8', note: '' }, { id: uid(), time: '21:00', title: 'Music & celebration', owner: 'c7', note: 'Curfew-friendly sound levels after 22:00' }],
      shots: [], deliverables: [{ id: uid(), title: 'Run-of-show document', due: rel(5), status: 'In progress' }, { id: uid(), title: 'Highlight film (5 min)', due: rel(30), status: 'Not started' }],
      notes: 'Bride’s family wants a surprise sufi ensemble during dinner — keep off the printed run of show.', color: '#23d5e8',
    },
    {
      id: 'p2', code: 'AP-26-028', name: 'Chinar Crafts — “Made by Hand” brand film', clientId: 'cl2', kind: 'film', service: 'Brand film', phase: 1, status: 'Active',
      startDate: rel(5), endDate: rel(7), location: 'Old City, Srinagar', venue: 'Artisan workshops, Zaina Kadal', guests: null, fee: 640000,
      brief: 'A 90-second brand film and three 15-second cutdowns following one papier-mâché piece from raw pulp to a buyer’s shelf. Observational, warm, natural light.',
      crew: [{ crewId: 'c2', role: 'Director of photography', rate: 15000, days: 3, call: '06:30' }, { crewId: 'c9', role: 'Camera operator / AC', rate: 6000, days: 3, call: '06:30' }, { crewId: 'c6', role: 'Gaffer', rate: 5000, days: 3, call: '06:00' }, { crewId: 'c10', role: 'Sound recordist', rate: 5500, days: 2, call: '07:00' }, { crewId: 'c4', role: 'Edit & colour', rate: 12000, days: 6, call: '—' }],
      tasks: [t('Creative brief', 'done'), t('Treatment & references', 'done', null, 'c2'), t('Script / shot list', 'doing', rel(1), 'c2'), t('Location recce', 'doing', rel(2), 'c1'), t('Permits', 'todo', rel(3), 'c1'), t('Crew & kit booking', 'todo', rel(3), 'c1'), t('Shoot', 'todo', rel(5)), t('Offline edit', 'todo', rel(14), 'c4'), t('Client review', 'todo', rel(17)), t('Colour grade', 'todo', rel(20), 'c4'), t('Final delivery', 'todo', rel(24))],
      budget: [b('Pre-production', 'Treatment, recce, scouting', 45000, 32000), b('Crew', '3-day unit', 165000, 0), b('Equipment', 'Cinema camera package, lenses, lighting', 95000, 0), b('Locations & permits', 'Workshop fees', 25000, 0), b('Talent', 'Artisans’ honorarium', 30000, 0), b('Travel & stays', 'Unit transport', 20000, 4000), b('Post-production', 'Edit, grade, mix, music licence', 110000, 0), b('Contingency', 'Reserve', 40000, 0)],
      schedule: [],
      shots: [
        { id: uid(), scene: '1', shot: '1A', desc: 'Old City rooftops at first light, mist over the Jhelum', type: 'WS', lens: '24mm', status: 'Planned' },
        { id: uid(), scene: '1', shot: '1B', desc: 'Pulp being kneaded — hands, steam, texture', type: 'CU', lens: '85mm', status: 'Planned' },
        { id: uid(), scene: '2', shot: '2A', desc: 'Naqash paints the first motif, single-hair brush', type: 'ECU', lens: '100mm macro', status: 'Planned' },
        { id: uid(), scene: '2', shot: '2B', desc: 'Master craftsman portrait, window light', type: 'MS', lens: '50mm', status: 'Planned' },
        { id: uid(), scene: '3', shot: '3A', desc: 'Finished piece wrapped, carried out through the lanes', type: 'Gimbal', lens: '35mm', status: 'Planned' },
      ],
      deliverables: [{ id: uid(), title: 'Master film — 90s', due: rel(24), status: 'Not started' }, { id: uid(), title: 'Social cutdowns × 3 (15s, 9:16)', due: rel(26), status: 'Not started' }],
      notes: 'Shoot mornings only — workshop light is best 7–11am.', color: '#f0a63a',
    },
    {
      id: 'p3', code: 'AP-26-024', name: 'Valley Tech Summit 2026', clientId: 'cl3', kind: 'event', service: 'Corporate event', phase: 2, status: 'Active',
      startDate: rel(22), endDate: rel(23), location: 'SKICC, Srinagar', venue: 'Main hall + breakout rooms', guests: 350, fee: 1200000,
      brief: 'Two-day summit: keynote stage with LED wall, three breakout tracks, registration, gala dinner on day one.',
      crew: [{ crewId: 'c1', role: 'Production manager', rate: 6000, days: 5, call: '07:00' }, { crewId: 'c3', role: 'Registration lead', rate: 4500, days: 3, call: '07:30' }, { crewId: 'c7', role: 'AV & sound', rate: 35000, days: 2, call: '06:00' }],
      tasks: [t('Discovery call & brief', 'done'), t('Venue recce', 'done'), t('Stage & LED design', 'doing', rel(6), 'c1'), t('Speaker logistics', 'todo', rel(10), 'c3'), t('Registration system', 'todo', rel(12), 'c3'), t('Run of show', 'todo', rel(16)), t('Event day', 'todo', rel(22))],
      budget: [b('Venue', 'Hall + 3 breakouts, 2 days', 240000, 120000), b('Sound & light', 'LED wall, PA, stage lighting', 260000, 0), b('Catering', 'Lunches + gala dinner', 310000, 0), b('Staffing', 'Registration & ushers', 50000, 0), b('Logistics', 'Speaker travel & stays', 120000, 0), b('Contingency', 'Reserve', 70000, 0)],
      schedule: [], shots: [], deliverables: [{ id: uid(), title: 'Event aftermovie (2 min)', due: rel(35), status: 'Not started' }], notes: '', color: '#8b7bff',
    },
    {
      id: 'p4', code: 'AP-26-019', name: 'Zubair Lone — “Shishir” music video', clientId: 'cl4', kind: 'film', service: 'Music video', phase: 3, status: 'Active',
      startDate: rel(-12), endDate: rel(-11), location: 'Gulmarg', venue: 'Snow meadow + wooden hut interior', guests: null, fee: 380000,
      brief: 'A winter music video: one performer, one long night, snow and firelight. Single-take chorus.',
      crew: [{ crewId: 'c2', role: 'Director of photography', rate: 15000, days: 2, call: '15:00' }, { crewId: 'c6', role: 'Gaffer', rate: 5000, days: 2, call: '14:00' }, { crewId: 'c4', role: 'Edit & colour', rate: 12000, days: 5, call: '—' }],
      tasks: [t('Treatment & references', 'done'), t('Location recce', 'done'), t('Shoot', 'done'), t('Offline edit', 'done', null, 'c4'), t('Client review', 'doing', rel(1)), t('Colour grade', 'todo', rel(5), 'c4'), t('Final delivery', 'todo', rel(9))],
      budget: [b('Crew', '2-day unit', 70000, 76000), b('Equipment', 'Camera, lights, generator', 60000, 64500), b('Travel & stays', 'Gulmarg, 2 nights', 45000, 52000), b('Post-production', 'Edit & grade', 70000, 36000), b('Contingency', 'Reserve', 20000, 0)],
      schedule: [], shots: [{ id: uid(), scene: '1', shot: '1A', desc: 'Performer walks into snow meadow, blue hour', type: 'WS', lens: '24mm', status: 'Shot' }, { id: uid(), scene: '2', shot: '2A', desc: 'Firelit chorus — single take', type: 'Gimbal', lens: '35mm', status: 'Shot' }],
      deliverables: [{ id: uid(), title: 'Music video master (4K)', due: rel(9), status: 'In review' }, { id: uid(), title: 'Vertical teaser', due: rel(10), status: 'In progress' }], notes: '', color: '#ff6b5a',
    },
    {
      id: 'p5', code: 'AP-26-011', name: 'Saffron Heritage — Spring Campaign', clientId: 'cl5', kind: 'film', service: 'Brand film', phase: 4, status: 'Wrapped',
      startDate: rel(-48), endDate: rel(-46), location: 'Pahalgam', venue: 'Hotel grounds & Lidder river', guests: null, fee: 520000,
      brief: 'Spring campaign film and stills for the hotel group’s website.',
      crew: [{ crewId: 'c2', role: 'DOP', rate: 15000, days: 3, call: '06:00' }, { crewId: 'c9', role: 'AC', rate: 6000, days: 3, call: '06:00' }],
      tasks: [t('Shoot', 'done'), t('Edit', 'done'), t('Final delivery', 'done')],
      budget: [b('Crew', 'Unit', 90000, 88000), b('Equipment', 'Package', 60000, 58000), b('Travel & stays', 'Pahalgam', 40000, 36000), b('Post-production', 'Edit & grade', 80000, 82000)],
      schedule: [], shots: [], deliverables: [{ id: uid(), title: 'Campaign film 60s', due: rel(-20), status: 'Delivered' }], notes: '', color: '#3ecf8e',
    },
  ];

  const leads = [
    { id: 'l1', title: 'Winter wedding in Gulmarg', clientName: 'Rafiq & Family', phone: '+91 90000 00006', email: 'rafiq.family@example.com', type: 'Wedding', stage: 'Proposal', value: 2400000, date: rel(75), location: 'Gulmarg', guests: 300, source: 'Referral', notes: 'Want snow, a fire-lit dinner and a heated marquee.', createdAt: new Date(Date.now() - 9 * 864e5).toISOString() },
    { id: 'l2', title: 'Hotel group retainer — 4 films a year', clientName: 'Saffron Heritage Hotels', phone: '+91 90000 00005', email: 'marketing@saffronheritage.example', type: 'Brand film', stage: 'Negotiation', value: 1800000, date: rel(40), location: 'Pahalgam', guests: null, source: 'Existing client', notes: 'Seasonal films: spring, summer, autumn, winter.', createdAt: new Date(Date.now() - 20 * 864e5).toISOString() },
    { id: 'l3', title: 'Documentary — the last boat-builders', clientName: 'Noor Foundation', phone: '', email: 'hello@noorfoundation.example', type: 'Documentary', stage: 'Contacted', value: 900000, date: rel(60), location: 'Srinagar', guests: null, source: 'Instagram', notes: 'Grant-funded. Needs a budget breakdown for the application.', createdAt: new Date(Date.now() - 4 * 864e5).toISOString() },
    { id: 'l4', title: 'Product launch — EV showroom', clientName: 'Northline Motors', phone: '+91 90000 00011', email: 'launch@northline.example', type: 'Corporate event', stage: 'New', value: 650000, date: rel(28), location: 'Srinagar', guests: 200, source: 'Website', notes: '', createdAt: new Date(Date.now() - 1 * 864e5).toISOString() },
    { id: 'l5', title: 'Sufi night under the chinars', clientName: 'Kashmir Arts Circle', phone: '+91 90000 00012', email: 'circle@example.com', type: 'Concert / festival', stage: 'New', value: 1100000, date: rel(50), location: 'Mughal Gardens', guests: 800, source: 'Walk-in', notes: 'Needs permissions for a heritage garden.', createdAt: new Date(Date.now() - 2 * 864e5).toISOString() },
    { id: 'l6', title: 'Engagement celebration', clientName: 'Sana Rather', phone: '+91 90000 00013', email: '', type: 'Celebration', stage: 'Lost', value: 300000, date: rel(12), location: 'Srinagar', guests: 120, source: 'Website', notes: 'Went with a family friend.', createdAt: new Date(Date.now() - 30 * 864e5).toISOString() },
    { id: 'l7', title: 'Lakeside wedding', clientName: 'Mehreen & Faisal', phone: '+91 90000 00001', email: 'mehreen.f@example.com', type: 'Wedding', stage: 'Won', value: 1850000, date: rel(9), location: 'Dal Lake', guests: 420, source: 'Website', notes: '', projectId: 'p1', createdAt: new Date(Date.now() - 60 * 864e5).toISOString() },
  ];

  const gear = [
    { id: 'g1', name: 'Cinema camera A', category: 'Camera', serial: 'CAM-A-001', value: 1450000, status: 'Available', bookings: [{ id: uid(), projectId: 'p2', from: rel(5), to: rel(7) }] },
    { id: 'g2', name: 'Cinema camera B', category: 'Camera', serial: 'CAM-B-002', value: 1450000, status: 'Available', bookings: [] },
    { id: 'g3', name: 'Prime lens set (24/35/50/85)', category: 'Lens', serial: 'LNS-PR-01', value: 620000, status: 'Available', bookings: [{ id: uid(), projectId: 'p2', from: rel(5), to: rel(7) }] },
    { id: 'g4', name: '100mm macro lens', category: 'Lens', serial: 'LNS-MC-01', value: 110000, status: 'Available', bookings: [{ id: uid(), projectId: 'p2', from: rel(5), to: rel(7) }] },
    { id: 'g5', name: 'LED panel kit (4 heads)', category: 'Lighting', serial: 'LGT-LED-04', value: 280000, status: 'Available', bookings: [] },
    { id: 'g6', name: 'Gimbal stabiliser', category: 'Grip', serial: 'GRP-GMB-01', value: 95000, status: 'Maintenance', bookings: [] },
    { id: 'g7', name: 'Wireless lav kit × 4', category: 'Audio', serial: 'AUD-LAV-04', value: 160000, status: 'Available', bookings: [{ id: uid(), projectId: 'p3', from: rel(22), to: rel(23) }] },
    { id: 'g8', name: 'Drone (licensed operator required)', category: 'Drone', serial: 'DRN-01', value: 210000, status: 'Available', bookings: [{ id: uid(), projectId: 'p1', from: rel(9), to: rel(10) }] },
    { id: 'g9', name: 'Wireless festoon & uplight set', category: 'Stage & AV', serial: 'AV-FST-01', value: 120000, status: 'Available', bookings: [{ id: uid(), projectId: 'p1', from: rel(8), to: rel(10) }] },
  ];

  const inv = (id, number, kind, projectId, clientId, issueDate, dueDate, items, payments = [], status = 'Sent') => ({ id, number, kind, projectId, clientId, issueDate, dueDate, items, gst: true, payments, status, notes: '' });
  const invoices = [
    inv('i1', 'AP/26-27/041', 'Invoice', 'p1', 'cl1', rel(-30), rel(-16), [{ desc: 'Wedding production — advance (40%)', qty: 1, rate: 740000 }], [{ id: uid(), date: rel(-18), amount: 873200, method: 'Bank transfer', ref: 'NEFT 4471' }]),
    inv('i2', 'AP/26-27/046', 'Invoice', 'p1', 'cl1', rel(-2), rel(12), [{ desc: 'Wedding production — second instalment (40%)', qty: 1, rate: 740000 }], [{ id: uid(), date: rel(-1), amount: 300000, method: 'UPI', ref: 'UPI 88123' }]),
    inv('i3', 'AP/26-27/043', 'Invoice', 'p2', 'cl2', rel(-10), rel(4), [{ desc: 'Brand film — pre-production advance (50%)', qty: 1, rate: 320000 }]),
    inv('i4', 'AP/26-27/038', 'Invoice', 'p4', 'cl4', rel(-35), rel(-5), [{ desc: 'Music video — production', qty: 1, rate: 250000 }], [{ id: uid(), date: rel(-25), amount: 150000, method: 'UPI', ref: 'UPI 70011' }]),
    inv('i5', 'AP/26-27/029', 'Invoice', 'p5', 'cl5', rel(-60), rel(-45), [{ desc: 'Spring campaign film', qty: 1, rate: 420000 }, { desc: 'Stills package', qty: 1, rate: 100000 }], [{ id: uid(), date: rel(-50), amount: 613600, method: 'Bank transfer', ref: 'NEFT 1302' }]),
    inv('i6', 'AP/26-27/044', 'Invoice', 'p3', 'cl3', rel(-6), rel(9), [{ desc: 'Summit production — advance (50%)', qty: 1, rate: 600000 }], [{ id: uid(), date: rel(-3), amount: 708000, method: 'Bank transfer', ref: 'RTGS 5590' }]),
    inv('q1', 'Q-26-017', 'Quote', null, null, rel(-4), rel(26), [{ desc: 'Winter wedding production — 3 days, Gulmarg', qty: 1, rate: 1650000 }, { desc: 'Heated marquee & winter staging', qty: 1, rate: 450000 }, { desc: 'Highlight film', qty: 1, rate: 300000 }], [], 'Sent'),
  ];
  invoices[6].leadId = 'l1';
  invoices[6].clientName = 'Rafiq & Family';

  const entries = [
    { id: uid(), title: 'Shikara route walkthrough', type: 'Recce', date: rel(2), start: '10:00', end: '12:00', projectId: 'p1', crewIds: ['c1'] },
    { id: uid(), title: 'Proposal call — Rafiq family', type: 'Meeting', date: rel(1), start: '16:00', end: '16:45', projectId: null, crewIds: [] },
    { id: uid(), title: 'Workshop recce, Zaina Kadal', type: 'Recce', date: rel(2), start: '07:30', end: '10:30', projectId: 'p2', crewIds: ['c2', 'c1'] },
    { id: uid(), title: 'Music video client review', type: 'Meeting', date: rel(1), start: '12:00', end: '13:00', projectId: 'p4', crewIds: ['c4'] },
    { id: uid(), title: 'SKICC technical walkthrough', type: 'Recce', date: rel(6), start: '11:00', end: '13:00', projectId: 'p3', crewIds: ['c1', 'c7'] },
  ];

  const now = Date.now();
  const activity = [
    { id: uid(), text: 'Payment of ₹3,00,000 recorded on AP/26-27/046', at: new Date(now - 26 * 36e5).toISOString(), kind: 'money' },
    { id: uid(), text: 'New website enquiry: Product launch — EV showroom', at: new Date(now - 30 * 36e5).toISOString(), kind: 'lead' },
    { id: uid(), text: 'Treatment approved for Chinar Crafts brand film', at: new Date(now - 50 * 36e5).toISOString(), kind: 'project' },
    { id: uid(), text: 'Offline edit delivered for “Shishir”', at: new Date(now - 74 * 36e5).toISOString(), kind: 'project' },
  ];

  return {
    version: 2,
    settings: {
      company: 'Aman Productions', tagline: 'Event Management & Film Production', address: 'Abi Guzar, Srinagar, Jammu & Kashmir 190001', phone: '+91 77809 96694',
      email: '', gstin: '', gstRate: 18, invoicePrefix: 'AP/26-27/', quotePrefix: 'Q-26-', bank: '', theme: 'dark', role: 'Owner', userName: 'Aman',
    },
    clients, crew, projects, leads, gear, invoices, entries, activity,
    seededAt: today(),
  };
}
