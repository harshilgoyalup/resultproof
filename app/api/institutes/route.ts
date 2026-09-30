import { NextResponse } from 'next/server';

// In-memory real dynamic store for up to 4 universities (Starts empty with zero demo data)
let registeredInstitutes: Array<{
  id: string;
  name: string;
  city: string;
  exams: string[];
  created_at: string;
}> = [];

const MAX_UNIVERSITIES = 4;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.toLowerCase();
  const exam = searchParams.get('exam')?.toLowerCase();
  const city = searchParams.get('city')?.toLowerCase();

  let results = [...registeredInstitutes];

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

export async function POST(request: Request) {
  try {
    if (registeredInstitutes.length >= MAX_UNIVERSITIES) {
      return NextResponse.json(
        {
          detail: `Maximum university capacity reached (${MAX_UNIVERSITIES} universities limit). No more universities can be added.`,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, city, exams } = body;

    if (!name || !city) {
      return NextResponse.json(
        { detail: 'University name and city are required.' },
        { status: 400 }
      );
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `univ-${Date.now()}`;

    // Check duplicate
    if (registeredInstitutes.some((inst) => inst.id === id || inst.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { detail: 'A university with this name is already registered.' },
        { status: 400 }
      );
    }

    const newInstitute = {
      id,
      name: name.trim(),
      city: city.trim(),
      exams: Array.isArray(exams) && exams.length > 0 ? exams : ['General Academic', 'Entrance'],
      created_at: new Date().toISOString(),
    };

    registeredInstitutes.push(newInstitute);

    return NextResponse.json(newInstitute, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || 'Failed to register university.' },
      { status: 400 }
    );
  }
}
