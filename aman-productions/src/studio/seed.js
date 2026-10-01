// Studio OS starts as a blank workspace. TEMPLATES give new productions a starter plan.
import { today } from './lib.js';

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
  return {
    version: 2,
    settings: {
      company: 'Aman Productions', tagline: 'Event Management & Film Production', address: 'Abi Guzar, Srinagar, Jammu & Kashmir 190001', phone: '+91 77809 96694',
      email: '', gstin: '', gstRate: 18, invoicePrefix: 'AP/26-27/', quotePrefix: 'Q-26-', bank: '', theme: 'light', role: 'Owner', userName: 'Aman',
    },
    clients: [], crew: [], projects: [], leads: [], gear: [], invoices: [], entries: [], activity: [],
    seededAt: today(),
  };
}
