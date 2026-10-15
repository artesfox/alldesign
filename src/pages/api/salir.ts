import type { APIRoute } from 'astro';
import { COOKIE } from '../../lib/auth';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete(COOKIE, { path: '/' });
  return redirect('/admin/login?salio=1', 303);
};
