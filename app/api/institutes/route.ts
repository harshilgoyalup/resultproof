import { NextResponse } from 'next/server';

// In-memory / serverless demo state for Vercel deployment
const SEED_INSTITUTES = [
  {
    id: 'apex-science-academy-kota',
    name: 'Apex Science Academy',
    city: 'Kota, Rajasthan',
    exams: ['JEE', 'NEET'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'pioneer-medical-delhi',
    name: 'Pioneer Medical Institute',
    city: 'New Delhi, DL',
    exams: ['NEET'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'chronicle-ias-hub-delhi',
    name: 'Chronicle IAS Hub',
    city: 'Old Rajinder Nagar, DL',
    exams: ['UPSC'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'resonance-tech-hyderabad',
    name: 'Resonance Tech Forum',
    city: 'Hyderabad, Telangana',
    exams: ['JEE', 'GATE'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'zenith-academy-pune',
    name: 'Zenith Academy for Competitive Exams',
    city: 'Pune, Maharashtra',
    exams: ['JEE', 'NEET'],
    created_at: new Date().toISOString(),
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.toLowerCase();
  const exam = searchParams.get('exam')?.toLowerCase();
  const city = searchParams.get('city')?.toLowerCase();

  let results = [...SEED_INSTITUTES];

  if (query) {
    results = results.filter(
      (inst) =>
        inst.name.toLowerCase().includes(query) ||
        inst.city.toLowerCase().includes(query)
    );
  }

  if (city) {
    results = results.filter((inst) => inst.city.toLowerCase().includes(city));
  }

  if (exam) {
    results = results.filter((inst) =>
      inst.exams.some((e) => e.toLowerCase().includes(exam))
    );
  }

  return NextResponse.json(results);
}
