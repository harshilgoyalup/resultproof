import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (email === 'admin@resultproof.org' && password === 'AdminSecretPass123!') {
      return NextResponse.json({
        access_token: 'mock_jwt_token_for_vercel_serverless_' + Date.now(),
        token_type: 'bearer',
        expires_in: 86400,
      });
    }

    return NextResponse.json(
      { detail: 'Incorrect email or password.' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { detail: 'Invalid login request payload.' },
      { status: 400 }
    );
  }
}
