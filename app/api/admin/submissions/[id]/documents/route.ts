import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  return NextResponse.json({
    submission_id: id,
    receipt_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALVmyKf7iwRa04kodS72xFeRrZol2WMGzGVcK2wXnygVQY6EGuJclnY4g7Z4SP-Aq3HDWgSE-xUG4Q62eZFYREFEZ3QKF7gJcQuQGiyM4lYA_PtuA4fz3ES6MeDXogaTltZnhdc97FS0aS4ppGDx3M-NsqN299hLYVZnAWfkikCK6UQSzM-nWOWwiUtEwt5-zdpCGWk3EnptoFD4SpBmOSAiGmB0HqrNL-0Z0EwaS4YedXmv1Iy1nC_Q',
    scorecard_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEYrohDfOjjmWlbl83GNhBToY0o-5BYKow-SuzkLOnoPxir3hZ-aw-VItPwZBVRO0gvmaa-_WxdY0VnfTbFBZDaVHYS9DR9SNQGN_7DuOt999jN7HkAbeaGR7rfLywKaSuZl0qTRfLOEsSVUP6VhFsnLwzp_S-CnMiO__GmsaJ0IWRGkNYhJRKpyqYhgt88Jfl2nqFwPqGs7FkEpcb7wzYo2IdcW1NG6IP1ubzl6c6-OT9kmaYeAkERQ',
    expires_in_seconds: 900,
    documents_purged: false,
  });
}
