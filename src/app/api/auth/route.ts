import { NextResponse } from 'next/server';
import { verifyPin } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    
    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'PIN is required' },
        { status: 400 }
      );
    }

    const isValid = await verifyPin(pin);
    
    if (isValid) {
      return NextResponse.json({ success: true, message: 'Login successful' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
